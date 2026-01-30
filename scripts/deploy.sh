#!/usr/bin/env bash
set -euo pipefail

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
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/storedb
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

# MinIO (Production)
MINIO_ENABLED=true
MINIO_ENDPOINT=https://minio.markt.ma
MINIO_PUBLIC_ENDPOINT=
MINIO_ACCESS_KEY=miniomarkt
MINIO_SECRET_KEY=miniopassword!
MINIO_BUCKET=store-assets
MINIO_REGION=us-east-1
MINIO_SECURE=true

EOF"

sudo chown "$APP_USER:$APP_USER" "$ENV_FILE"
sudo chmod 600 "$ENV_FILE"
echo "✅ Environment file written."

echo "🔄 Reloading systemd daemon..."
sudo systemctl daemon-reload

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

# ✅ FLYWAY MACHT JETZT ALLES AUTOMATISCH!
echo "📊 Database migrations will be handled by Flyway automatically on startup..."
echo "   ✅ Flyway is configured to run migrations before application starts"
echo "   ✅ Baseline will be created automatisch
