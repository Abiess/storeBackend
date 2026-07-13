#!/usr/bin/env bash
set -euo pipefail

# ✅ Hilfsfunktionen für farbige Ausgabe
print_warning() {
    echo "⚠️  WARNING: $1"
}

print_error() {
    echo "❌ ERROR: $1"
}

print_success() {
    echo "✅ $1"
}

# ==========================================
# OPTIONAL: Database Reset (Fresh Start)
# ==========================================
# Set RESET_DATABASE=true for complete fresh start
RESET_DATABASE="${RESET_DATABASE:-false}"

APP_USER="storebackend"
SERVICE_NAME="storebackend"

APP_DIR="/opt/storebackend"
BACKUP_DIR="$APP_DIR/backups"
JAR_PATH="$APP_DIR/app.jar"
TMP_JAR="/tmp/app.jar"

LOG_DIR="/var/log/storebackend"
LOG_FILE="$LOG_DIR/app.log"

# systemd EnvironmentFile
ENV_FILE="/etc/storebackend.env"

# Healthcheck-URL (Spring Boot Actuator)
HEALTH_URL="http://localhost:8080/actuator/health"

MAX_RETRIES=30
SLEEP_SECONDS=2

echo "================ Store Backend Deployment (production) ================"
echo "🚀 Starting deployment with Flyway migrations..."

# Prüfe auf Database Reset Flag
if [ "$RESET_DATABASE" = "true" ]; then
    echo "🔥 RESET_DATABASE=true detected - Performing complete database reset..."
    echo "⚠️  This will DELETE all data and start fresh with V1__initial_schema.sql"

    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    if [ -f "$SCRIPT_DIR/reset-database-fresh.sh" ]; then
        # Auto-confirm für CI/CD
        echo "DELETE-ALL" | bash "$SCRIPT_DIR/reset-database-fresh.sh"
    else
        print_error "reset-database-fresh.sh not found!"
        exit 1
    fi
fi

echo "⏹️  Stopping old application (systemd service: $SERVICE_NAME)..."
if sudo systemctl list-unit-files | grep -q "^${SERVICE_NAME}.service"; then
  sudo systemctl stop "$SERVICE_NAME" || echo "⚠️  Service not running (ok)"
else
  echo "⚠️  Service $SERVICE_NAME not found (maybe first deployment)"
fi

echo "💾 Backing up old version..."
sudo mkdir -p "$BACKUP_DIR"
if [ -f "$JAR_PATH" ]; then
  TS=$(date +"%Y%m%d-%H%M%S")
  BACKUP_FILE="$BACKUP_DIR/app-$TS.jar"
  echo "   Backing up $JAR_PATH to $BACKUP_FILE"
  sudo cp "$JAR_PATH" "$BACKUP_FILE"
else
  echo "   No existing $JAR_PATH found. Skipping backup."
fi

echo "📦 Checking for JAR in /tmp..."
if [ ! -f "$TMP_JAR" ]; then
  echo "❌ No JAR file found in /tmp/"
  echo "Available files in /tmp:"
  ls -l /tmp | sed 's/^/   /'
  exit 1
fi

JAR_SIZE=$(stat --format=%s "$TMP_JAR" 2>/dev/null || stat -f%z "$TMP_JAR" 2>/dev/null || echo 0)
echo "📦 Found JAR file: $(basename "$TMP_JAR") ($(numfmt --to=iec $JAR_SIZE 2>/dev/null || du -h "$TMP_JAR" | cut -f1))"

echo "📦 Installing new version..."
echo "   Source: $TMP_JAR"
echo "   Target: $JAR_PATH"
sudo mv "$TMP_JAR" "$JAR_PATH"
sudo chown "$APP_USER:$APP_USER" "$JAR_PATH"

echo "✅ JAR installed successfully (verified)"

echo "🧾 Ensuring log directory exists..."
sudo mkdir -p "$LOG_DIR"
sudo chown -R "$APP_USER:$APP_USER" "$LOG_DIR"

echo "🔧 Configuring environment for PRODUCTION..."

if [ -z "${DB_PASSWORD:-}" ] || [ -z "${JWT_SECRET:-}" ]; then
  echo "⚠️  DB_PASSWORD or JWT_SECRET is not set in the environment."
  echo "    The application may fail to connect to the DB or validate tokens."
fi

# Generiere einen sicheren JWT_SECRET falls nicht gesetzt (mindestens 256 Bits)
if [ -z "${JWT_SECRET:-}" ]; then
  echo "⚠️  JWT_SECRET not provided - generating secure random secret..."
  JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')
  echo "✅ Generated secure JWT_SECRET (512 bits)"
fi

echo "🔐 Writing environment file for systemd: $ENV_FILE"
sudo bash -c "cat > '$ENV_FILE' <<EOF
# JVM
JAVA_OPTS=-Xms512m -Xmx1024m -XX:+UseG1GC

# Spring profile
SPRING_PROFILES_ACTIVE=production

# PostgreSQL (Production)
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/storedb?currentSchema=public
SPRING_DATASOURCE_USERNAME=storeapp
SPRING_DATASOURCE_PASSWORD=${DB_PASSWORD:-}
SPRING_DATASOURCE_DRIVER_CLASS_NAME=org.postgresql.Driver

# JWT (mindestens 256 Bits erforderlich)
JWT_SECRET=${JWT_SECRET}

# Server / Port
SERVER_PORT=8080

# Logging
LOGGING_LEVEL_ROOT=INFO
LOGGING_FILE_NAME=$LOG_FILE

# SMTP Configuration (Email Verification)
SMTP_HOST=${SMTP_HOST}
SMTP_PORT=${SMTP_PORT}
SMTP_USER=${SMTP_USER}
SMTP_PASS=${SMTP_PASS}
MAIL_FROM=${MAIL_FROM}
MAIL_ENABLED=${MAIL_ENABLED:-true}

# Application Configuration
APP_BASE_URL=${APP_BASE_URL}

# MinIO (Production)
MINIO_ENABLED=true
MINIO_ENDPOINT=https://minio.markt.ma
MINIO_PUBLIC_ENDPOINT=
MINIO_ACCESS_KEY=miniomarkt
MINIO_SECRET_KEY=miniopassword!
MINIO_BUCKET=store-assets
MINIO_REGION=us-east-1
MINIO_SECURE=true

# CJ Dropshipping API (Phase 2)
CJ_API_BASE_URL=${CJ_API_BASE_URL:-https://developers.cjdropshipping.com/api2.0/v1}
CJ_API_TIMEOUT=${CJ_API_TIMEOUT:-30000}

# Hugging Face API Key (AI Product Creation – Legacy)
HUGGINGFACE_API_KEY=${HUGGINGFACE_API_KEY:-}

# OpenRouter API Key (AI Product Creation – bevorzugt, OpenAI-kompatibel)
OPENROUTER_API_KEY=${OPENROUTER_API_KEY:-}

# Telegram Bot Auth
TELEGRAM_AUTH_BOT_TOKEN=${TELEGRAM_AUTH_BOT_TOKEN:-}
TELEGRAM_AUTH_BOT_USERNAME=${TELEGRAM_AUTH_BOT_USERNAME:-marktma_verify_bot}

# Unsplash API Key (Bildvorschläge im Wizard – NIEMALS ins Frontend/Git!)
UNSPLASH_ACCESS_KEY=${UNSPLASH_ACCESS_KEY:-}

# CAPTCHA Configuration (Bot-Schutz für Registrierung, Login, Password-Reset)
# Provider: hcaptcha (empfohlen, DSGVO-konform) oder recaptcha
# hCaptcha: https://www.hcaptcha.com/ → Sites → New Site → Secret Key
# reCAPTCHA: https://www.google.com/recaptcha/admin → v3 → Secret Key
CAPTCHA_ENABLED=${CAPTCHA_ENABLED:-true}
CAPTCHA_PROVIDER=${CAPTCHA_PROVIDER:-hcaptcha}
CAPTCHA_SECRET=${CAPTCHA_SECRET:-}
CAPTCHA_MIN_SCORE=${CAPTCHA_MIN_SCORE:-0.5}
EMAIL_VERIFICATION_SKIP=${EMAIL_VERIFICATION_SKIP:-false}

# DHL Parcel DE Shipping API
# Sandbox Keys for testing, Production Keys from DHL Business Customer Portal
DHL_ENABLED=${DHL_ENABLED:-false}
DHL_ENV=${DHL_ENV:-sandbox}
DHL_CLIENT_ID=${DHL_CLIENT_ID:-}
DHL_CLIENT_SECRET=${DHL_CLIENT_SECRET:-}
DHL_AUTH_URL=${DHL_AUTH_URL:-https://api-sandbox.dhl.com/parcel/de/account/auth/ropc/v1/token}
DHL_SHIPPING_BASE_URL=${DHL_SHIPPING_BASE_URL:-https://api-sandbox.dhl.com/parcel/de/shipping/v2}
DHL_SANDBOX_USERNAME=${DHL_SANDBOX_USERNAME:-user-valid}
DHL_SANDBOX_PASSWORD=${DHL_SANDBOX_PASSWORD:-SandboxPasswort2023!}
DHL_DEFAULT_PROFILE=${DHL_DEFAULT_PROFILE:-STANDARD_GRUPPENPROFIL}
DHL_DEFAULT_PRODUCT=${DHL_DEFAULT_PRODUCT:-V01PAK}
DHL_DEFAULT_BILLING_NUMBER=${DHL_DEFAULT_BILLING_NUMBER:-33333333330102}
DHL_TIMEOUT=${DHL_TIMEOUT:-30000}
DHL_TOKEN_CACHE_DURATION=${DHL_TOKEN_CACHE_DURATION:-82800}
DHL_DEFAULT_WEIGHT_GRAMS=${DHL_DEFAULT_WEIGHT_GRAMS:-1000}
DHL_DEFAULT_LENGTH_MM=${DHL_DEFAULT_LENGTH_MM:-300}
DHL_DEFAULT_WIDTH_MM=${DHL_DEFAULT_WIDTH_MM:-200}
DHL_DEFAULT_HEIGHT_MM=${DHL_DEFAULT_HEIGHT_MM:-150}
DHL_SANDBOX_SHIPPER_NAME=${DHL_SANDBOX_SHIPPER_NAME:-Test Store}
DHL_SANDBOX_SHIPPER_STREET=${DHL_SANDBOX_SHIPPER_STREET:-Musterstraße}
DHL_SANDBOX_SHIPPER_HOUSE_NUMBER=${DHL_SANDBOX_SHIPPER_HOUSE_NUMBER:-1}
DHL_SANDBOX_SHIPPER_POSTAL_CODE=${DHL_SANDBOX_SHIPPER_POSTAL_CODE:-53113}
DHL_SANDBOX_SHIPPER_CITY=${DHL_SANDBOX_SHIPPER_CITY:-Bonn}
DHL_SANDBOX_SHIPPER_COUNTRY=${DHL_SANDBOX_SHIPPER_COUNTRY:-DE}

# ════════════════════════════════════════════════════════════
# DHL Platform Credentials (markt.ma zentral)
# ════════════════════════════════════════════════════════════
# Diese Credentials ermöglichen Production-Versand für normale Händler,
# ohne dass sie einen eigenen DHL Developer Portal Account benötigen.
# Händler bringen nur mit: DHL Geschäftskunden-Username, Passwort, Abrechnungsnummer.
#
# WICHTIG:
# - Client Secret NIEMALS loggen oder echo ausgeben
# - Platform Credentials nur nutzen wenn ALLOWED=true
# - Store-spezifische Credentials haben Vorrang
#
# Defaults: leer = deaktiviert
DHL_PLATFORM_CLIENT_ID=${DHL_PLATFORM_CLIENT_ID:-}
DHL_PLATFORM_CLIENT_SECRET=${DHL_PLATFORM_CLIENT_SECRET:-}
DHL_PLATFORM_CREDENTIALS_ALLOWED=${DHL_PLATFORM_CREDENTIALS_ALLOWED:-false}
# SECURITY: Encryption Key für DB-Felder (Passwörter, API Secrets)
# WICHTIG: NIEMALS loggen! Key muss stabil bleiben (nicht bei jedem Deploy neu generieren).
APP_SECRET_ENCRYPTION_KEY=${APP_SECRET_ENCRYPTION_KEY:-}

# ── Frontend Analytics (nur Dokumentation – wird beim Angular-Build gebacken) ──
# Microsoft Clarity: ID in storeFrontend/src/environments/environment.prod.ts
# setzen, dann Frontend neu bauen: cd storeFrontend && npm run build -- --configuration=production
# Aktuell konfigurierte Clarity-ID: siehe environment.prod.ts → clarityId
# Deaktivieren: clarityId: '' setzen und neu deployen.

# Hibernate DDL-Strategie (Default 'update' = neue Spalten anlegen, Daten erhalten)
# Override für Flyway-Migration: SPRING_JPA_HIBERNATE_DDL_AUTO=validate
SPRING_JPA_HIBERNATE_DDL_AUTO=${SPRING_JPA_HIBERNATE_DDL_AUTO:-update}

EOF"

sudo chown "$APP_USER:$APP_USER" "$ENV_FILE"
sudo chmod 600 "$ENV_FILE"
echo "✅ /etc/storebackend.env updated"

# Security Check: Warnung wenn Encryption Key fehlt
if [ -z "${APP_SECRET_ENCRYPTION_KEY:-}" ]; then
  echo "⚠️  WARNING: APP_SECRET_ENCRYPTION_KEY is not set!"
  echo "   Secrets (passwords, API keys) cannot be encrypted in database."
  echo "   This is acceptable for dev/test, but NOT for production."
  echo "   Generate with: openssl rand -base64 32"
  echo "   Add to GitHub Secrets as: APP_SECRET_ENCRYPTION_KEY"
else
  echo "✅ APP_SECRET_ENCRYPTION_KEY is configured (length: ${#APP_SECRET_ENCRYPTION_KEY} chars)"
fi

echo "🔄 Reloading systemd daemon..."
sudo systemctl daemon-reload

# ==========================================================================
# DB-Permissions absichern (verhindert "ERROR: must be owner of table xxx")
# Lässt grant-permissions.sql idempotent durchlaufen, BEVOR die App startet.
# ==========================================================================
echo ""
echo "🔐 Sichere Datenbank-Permissions ab (storeapp = Owner aller Tabellen)..."
SCRIPT_DIR_DEPLOY="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$SCRIPT_DIR_DEPLOY/fix-db-permissions.sh" ]; then
    if bash "$SCRIPT_DIR_DEPLOY/fix-db-permissions.sh"; then
        echo "   ✅ Permissions ok."
    else
        echo "   ⚠️  Permissions-Setup fehlgeschlagen — App startet trotzdem (DDL kann fehlschlagen)"
    fi
else
    echo "   ⚠️  fix-db-permissions.sh nicht gefunden — überspringe."
fi
echo ""

# ==========================================================================
# DB-Migrationen ausführen (idempotent)
# Führt alle *.sql Dateien aus scripts/db/migrations/ in alphabetischer
# Reihenfolge aus. Jede Migration MUSS idempotent sein (IF NOT EXISTS, etc.)
# ==========================================================================
echo "🗃️  Führe Datenbank-Migrationen aus..."
MIGRATIONS_DIR="$SCRIPT_DIR_DEPLOY/db/migrations"
if [ -d "$MIGRATIONS_DIR" ]; then
    MIGRATION_FILES=$(find "$MIGRATIONS_DIR" -maxdepth 1 -name "V*.sql" -type f | sort)
    if [ -z "$MIGRATION_FILES" ]; then
        echo "   ℹ️  Keine Migrationen gefunden in $MIGRATIONS_DIR"
    else
        MIGRATION_COUNT=0
        MIGRATION_FAILED=0
        for migration in $MIGRATION_FILES; do
            MIGRATION_COUNT=$((MIGRATION_COUNT + 1))
            MIGRATION_NAME=$(basename "$migration")
            echo "   ▶️  $MIGRATION_NAME"
            # Ausführung als postgres-Superuser, dann an storeapp-DB
            if sudo -u postgres psql -d storedb -v ON_ERROR_STOP=1 -q -f "$migration" > /tmp/migration-output.log 2>&1; then
                echo "      ✅ ok"
            else
                MIGRATION_FAILED=$((MIGRATION_FAILED + 1))
                print_error "Migration $MIGRATION_NAME fehlgeschlagen!"
                echo "      Log:"
                sed 's/^/         /' /tmp/migration-output.log
            fi
        done
        if [ "$MIGRATION_FAILED" -gt 0 ]; then
            print_error "$MIGRATION_FAILED von $MIGRATION_COUNT Migrationen fehlgeschlagen — App startet trotzdem"
        else
            print_success "Alle $MIGRATION_COUNT Migrationen erfolgreich angewendet."
        fi
    fi
else
    echo "   ℹ️  Migrations-Ordner $MIGRATIONS_DIR existiert nicht — überspringe."
fi
echo ""

# Check and install MinIO if needed
echo ""
echo "🗄️  Checking MinIO..."
if systemctl is-active --quiet minio 2>/dev/null; then
    echo "   ✅ MinIO is already running"
elif systemctl list-unit-files | grep -q "^minio.service"; then
    echo "   ⚠️  MinIO service exists but not running - starting..."
    sudo systemctl start minio
    sleep 2
    if systemctl is-active --quiet minio; then
        echo "   ✅ MinIO started successfully"
    else
        echo "   ❌ MinIO failed to start - check logs: sudo journalctl -u minio -n 50"
    fi
else
    echo "   ⚠️  MinIO not installed - installing now..."
    INSTALL_SCRIPT="$APP_DIR/scripts/install-minio.sh"
    if [ -f "$INSTALL_SCRIPT" ]; then
        chmod +x "$INSTALL_SCRIPT"
        if bash "$INSTALL_SCRIPT"; then
            echo "   ✅ MinIO installed and started successfully!"
        else
            echo "   ❌ MinIO installation failed"
            echo "   ⚠️  Application may not be able to upload images"
            echo "   💡 Install manually: sudo $INSTALL_SCRIPT"
        fi
    else
        echo "   ❌ MinIO installation script not found: $INSTALL_SCRIPT"
        echo "   ⚠️  Application may not be able to upload images"
    fi
fi
echo ""

# Erstelle oder aktualisiere systemd Service
echo "🔧 Setting up systemd service..."
SYSTEMD_SERVICE="/etc/systemd/system/${SERVICE_NAME}.service"

sudo bash -c "cat > '$SYSTEMD_SERVICE' <<'EOF'
[Unit]
Description=Store Backend Spring Boot Application
After=network.target postgresql.service

[Service]
Type=simple
User=storebackend
Group=storebackend

# Environment-Datei laden
EnvironmentFile=/etc/storebackend.env

# CRITICAL FIX: API Keys direkt als Environment Variables
# (systemd liest manchmal EnvironmentFile nicht korrekt)
Environment="HUGGINGFACE_API_KEY=\${HUGGINGFACE_API_KEY}"
Environment="OPENROUTER_API_KEY=\${OPENROUTER_API_KEY}"
Environment="TELEGRAM_AUTH_BOT_TOKEN=\${TELEGRAM_AUTH_BOT_TOKEN}"
Environment="TELEGRAM_AUTH_BOT_USERNAME=\${TELEGRAM_AUTH_BOT_USERNAME}"

# JAR ausführen
ExecStart=/usr/bin/java \$JAVA_OPTS -jar /opt/storebackend/app.jar

# Working Directory
WorkingDirectory=/opt/storebackend

# Restart-Strategie (wichtig bei DB-Connection-Problemen während Start)
Restart=on-failure
RestartSec=10s
StartLimitInterval=300s
StartLimitBurst=5

# Security (optional)
NoNewPrivileges=true
PrivateTmp=true

# Standard-Ausgabe ins Journal
StandardOutput=journal
StandardError=journal
SyslogIdentifier=storebackend

[Install]
WantedBy=multi-user.target
EOF"

echo "✅ Systemd service file created/updated"

echo "🔄 Enabling and starting service..."
sudo systemctl daemon-reload
sudo systemctl enable "$SERVICE_NAME"
sudo systemctl start "$SERVICE_NAME"

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📊 Service Status:"
sudo systemctl status "$SERVICE_NAME" --no-pager || true
echo ""
echo "📋 View logs with:"
echo "   sudo journalctl -u $SERVICE_NAME -f"
echo ""
echo "🏥 Health check will be performed by GitHub Actions..."
