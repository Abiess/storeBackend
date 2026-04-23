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

ENV_FILE="/etc/storebackend.env"
HEALTH_URL="http://localhost:8080/actuator/health"

MAX_RETRIES=30
SLEEP_SECONDS=2

echo "================ Store Backend Deployment ================"

echo "⏹️  Stopping old application (systemd service: $SERVICE_NAME)..."
if sudo systemctl list-unit-files | grep -q "^${SERVICE_NAME}.service"; then
  if ! sudo systemctl stop "$SERVICE_NAME"; then
    echo "⚠️  Failed to stop $SERVICE_NAME (maybe not running). Continuing..."
  fi
else
  echo "⚠️  Service $SERVICE_NAME not found (maybe first deployment)."
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

echo "📦 Installing new version..."
echo "   Source: $TMP_JAR"
echo "   Target: $JAR_PATH"

if [ ! -f "$TMP_JAR" ]; then
  echo "❌ No JAR file found at $TMP_JAR"
  exit 1
fi

sudo mv "$TMP_JAR" "$JAR_PATH"
sudo chown "$APP_USER:$APP_USER" "$JAR_PATH"

echo "✅ JAR installed successfully (verified)"

echo "🧾 Ensuring log directory exists..."
sudo mkdir -p "$LOG_DIR"
sudo chown -R "$APP_USER:$APP_USER" "$LOG_DIR"

echo "🔧 Configuring environment..."
if [ -z "${DB_PASSWORD:-}" ] || [ -z "${JWT_SECRET:-}" ]; then
  echo "⚠️  DB_PASSWORD or JWT_SECRET is not set in the environment."
  echo "    The application may fail to connect to the DB or validate tokens."
fi

echo "🔐 Writing environment file for systemd: $ENV_FILE"
sudo bash -c "cat > '$ENV_FILE' <<EOF
JAVA_OPTS=-Xms512m -Xmx1024m -XX:+UseG1GC

SPRING_PROFILES_ACTIVE=production
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/storedb
SPRING_DATASOURCE_USERNAME=postgres
SPRING_DATASOURCE_PASSWORD=${DB_PASSWORD:-}
JWT_SECRET=${JWT_SECRET:-}
HUGGINGFACE_API_KEY=${HUGGINGFACE_API_KEY:-}
SERVER_PORT=8080

# Hibernate DDL-Strategie (Default 'update' = neue Spalten anlegen, Daten erhalten)
SPRING_JPA_HIBERNATE_DDL_AUTO=${SPRING_JPA_HIBERNATE_DDL_AUTO:-update}

LOGGING_LEVEL_ROOT=INFO
LOGGING_FILE_NAME=$LOG_FILE
EOF"

sudo chown storebackend:storebackend "$ENV_FILE"
sudo chmod 600 "$ENV_FILE"
echo "✅ Environment file written."

echo "🔄 Reloading systemd daemon..."
sudo systemctl daemon-reload

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
