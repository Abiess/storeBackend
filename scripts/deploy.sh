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

# Datenbank-Diagnose Script (im scripts Verzeichnis)
DIAGNOSE_SCRIPT="$APP_DIR/scripts/diagnose-database.sh"

echo "================ Store Backend Deployment (production) ================"
echo "🚀 Starting deployment..."

echo "⏹️  Stopping old application (systemd service: $SERVICE_NAME)..."
if sudo systemctl list-unit-files | grep -q "^${SERVICE_NAME}.service"; then
  sudo systemctl stop "$SERVICE_NAME" || echo "⚠️  Service not running (ok)"
else
  echo "⚠️  Service $SERVICE_NAME not found (maybe first deployment)"
fi

# Optional: Datenbank zurücksetzen, wenn RESET_DATABASE=true gesetzt ist
if [ "${RESET_DATABASE:-false}" = "true" ]; then
  echo ""
  echo "🗑️  Database reset requested..."
  RESET_SCRIPT="$APP_DIR/scripts/reset-database.sh"
  if [ -f "$RESET_SCRIPT" ]; then
    export DB_PASSWORD="${DB_PASSWORD:-}"
    if bash "$RESET_SCRIPT"; then
      echo "✅ Database reset completed"
    else
      echo "⚠️  Database reset failed, but continuing..."
    fi
  else
    echo "⚠️  Reset script not found: $RESET_SCRIPT"
  fi
  echo ""
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
# optional: falls du mal den Expiry per Env steuern willst
# JWT_EXPIRATION=86400000

# Server / Port
SERVER_PORT=8080

# Logging
LOGGING_LEVEL_ROOT=INFO
LOGGING_FILE_NAME=$LOG_FILE

# MinIO (Production) – Werte bei Bedarf in CI/Server-Env überschreiben
MINIO_ENABLED=true
MINIO_ENDPOINT=http://localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=store-assets
MINIO_REGION=us-east-1
MINIO_SECURE=false
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
        echo "   💡 Download script from repository"
    fi
fi
echo ""

# Smart Database Migration VOR dem App-Start
echo ""
echo "🗃️  Running smart database migration..."
MIGRATION_SCRIPT="$APP_DIR/scripts/smart-db-migration.sh"
if [ -f "$MIGRATION_SCRIPT" ]; then
  export DB_PASSWORD="${DB_PASSWORD:-}"
  export AUTO_DEPLOY=true  # Automatisch Migration wählen (keine Daten löschen)
  chmod +x "$MIGRATION_SCRIPT"
  if bash "$MIGRATION_SCRIPT"; then
    echo "✅ Database migration completed successfully!"
  else
    echo "❌ Migration failed!"
    echo "    The application may fail to start if tables don't exist."
    exit 1
  fi
else
  echo "⚠️  Migration script not found: $MIGRATION_SCRIPT"
  echo "    Skipping migration - relying on Hibernate DDL."
fi
echo ""

echo "🚀 Starting new application via systemd ($SERVICE_NAME)..."
if ! sudo systemctl start "$SERVICE_NAME"; then
  echo "❌ Failed to start $SERVICE_NAME"
  echo "📋 systemctl status:"
  sudo systemctl status "$SERVICE_NAME" --no-pager || true
  echo "📋 journalctl (last 50 lines):"
  sudo journalctl -u "$SERVICE_NAME" -n 50 --no-pager || true
  exit 1
fi

echo "⏳ Waiting for application to become healthy on $HEALTH_URL ..."
i=1
while [ $i -le $MAX_RETRIES ]; do
  echo "🏥 Waiting for health check... ($i/$MAX_RETRIES)"
  if curl -fsS "$HEALTH_URL" > /dev/null 2>&1; then
    echo "✅ Application is healthy!"

    # Datenbank-Diagnose nach erfolgreichem Start
    echo ""
    echo "🔍 Running database diagnostics..."
    if [ -f "$DIAGNOSE_SCRIPT" ]; then
      export DB_PASSWORD="${DB_PASSWORD:-}"
      if bash "$DIAGNOSE_SCRIPT"; then
        echo "✅ Database tables verified successfully!"
      else
        echo "⚠️  Database diagnostics failed - tables may be missing!"
        echo "    Check logs and application configuration."
        echo ""
        echo "📋 Application startup logs (last 100 lines):"
        sudo journalctl -u "$SERVICE_NAME" -n 100 --no-pager || true
        exit 1
      fi
    else
      echo "⚠️  Diagnose script not found: $DIAGNOSE_SCRIPT"
      echo "    Skipping database verification."
    fi

    echo "✅ Application is healthy and running!"
    echo ""
    echo "================ Deployment Complete ================"
    echo "🎉 Store Backend successfully deployed"
    echo "📍 Application URL: http://localhost:8080"
    echo "💚 Health Check: $HEALTH_URL"
    echo "📋 Logs: sudo journalctl -u $SERVICE_NAME -f"
    echo "===================================================="

    # Cleanup old rollback files
    echo ""
    echo "🧹 Cleaning up old rollback files..."
    ROLLBACK_DIR="$APP_DIR/rollback"
    KEEP_COUNT=5

    if [ -d "$ROLLBACK_DIR" ]; then
        CURRENT_COUNT=$(ls -1 "$ROLLBACK_DIR"/*.jar 2>/dev/null | wc -l)
        if [ "$CURRENT_COUNT" -gt "$KEEP_COUNT" ]; then
            echo "   Found $CURRENT_COUNT rollback files, keeping only $KEEP_COUNT newest..."
            ls -t "$ROLLBACK_DIR"/*.jar | tail -n +$((KEEP_COUNT + 1)) | while read -r file; do
                echo "   Deleting: $(basename "$file")"
                sudo rm -f "$file"
            done
            REMAINING_COUNT=$(ls -1 "$ROLLBACK_DIR"/*.jar 2>/dev/null | wc -l)
            echo "   ✅ Cleanup complete! Remaining rollback files: $REMAINING_COUNT"
        else
            echo "   ✅ Only $CURRENT_COUNT rollback files found, no cleanup needed"
        fi
    else
        echo "   ⚠️  Rollback directory not found: $ROLLBACK_DIR"
    fi

    exit 0
  fi
  sleep "$SLEEP_SECONDS"
  i=$((i + 1))
done

echo "❌ Application failed to become healthy after $MAX_RETRIES attempts."

echo "📋 Last 50 lines from journal for $SERVICE_NAME:"
sudo journalctl -u "$SERVICE_NAME" -n 50 --no-pager || echo "-- No journal entries --"

if [ -f "$LOG_FILE" ]; then
  echo "📋 Last 50 lines of application log ($LOG_FILE):"
  sudo tail -n 50 "$LOG_FILE" || echo "-- No log entries --"
else
  echo "ℹ️  Log file $LOG_FILE does not exist yet."
fi

echo "🔄 Attempting rollback..."
LAST_BACKUP=$(ls -1t "$BACKUP_DIR"/app-*.jar 2>/dev/null | head -n 1 || true)
if [ -z "$LAST_BACKUP" ]; then
  echo "⚠️  No backup JAR found to roll back to."
  exit 1
fi

echo "   Rolling back to: $LAST_BACKUP"
sudo cp "$LAST_BACKUP" "$JAR_PATH"
sudo chown "$APP_USER:$APP_USER" "$JAR_PATH"

echo "🔁 Restarting service with rolled-back version..."
if ! sudo systemctl restart "$SERVICE_NAME"; then
  echo "❌ Rollback failed: could not restart $SERVICE_NAME"
  echo "📋 systemctl status after rollback attempt:"
  sudo systemctl status "$SERVICE_NAME" --no-pager || true
  exit 1
fi

echo "✅ Rollback attempted. Please verify application health manually."
exit 1
