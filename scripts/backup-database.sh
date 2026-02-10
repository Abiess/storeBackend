#!/bin/bash

# ============================================
# Database Backup Script - Enhanced Version
# ============================================
# Erstellt ein vollständiges Backup der PostgreSQL Datenbank
# mit Verifizierung, Rotation und Monitoring

set -euo pipefail  # Exit on error, undefined variables, and pipe failures

# ============================================
# CONFIGURATION
# ============================================
BACKUP_DIR="${BACKUP_DIR:-/opt/storebackend/backups/database}"
DB_NAME="${DB_NAME:-storedb}"
DB_USER="${DB_USER:-postgres}"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="$BACKUP_DIR/storedb-$TIMESTAMP.sql"
LOG_FILE="/var/log/storebackend/backup.log"
ALERT_EMAIL="${ALERT_EMAIL:-admin@localhost}"

# Retention Policy
DAILY_RETENTION=7      # Tägliche Backups für 7 Tage
WEEKLY_RETENTION=28    # Wöchentliche Backups für 4 Wochen
MONTHLY_RETENTION=365  # Monatliche Backups für 1 Jahr

# ============================================
# LOGGING FUNCTIONS
# ============================================
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1" | tee -a "$LOG_FILE" >&2
}

send_alert() {
    local subject="$1"
    local message="$2"

    # E-Mail senden (wenn mailutils installiert ist)
    if command -v mail &> /dev/null; then
        echo "$message" | mail -s "$subject" "$ALERT_EMAIL"
    fi

    # Webhook (optional - für Slack, Discord, etc.)
    if [ -n "${WEBHOOK_URL:-}" ]; then
        curl -X POST -H 'Content-Type: application/json' \
            -d "{\"text\":\"$subject: $message\"}" \
            "$WEBHOOK_URL" 2>/dev/null || true
    fi
}

# ============================================
# SETUP
# ============================================
# Erstelle notwendige Verzeichnisse
mkdir -p "$BACKUP_DIR"
mkdir -p "$(dirname "$LOG_FILE")"
mkdir -p "$BACKUP_DIR/daily"
mkdir -p "$BACKUP_DIR/weekly"
mkdir -p "$BACKUP_DIR/monthly"

log "🗄️  Starting database backup..."
log "Database: $DB_NAME"
log "Backup directory: $BACKUP_DIR"

# ============================================
# PRE-BACKUP CHECKS
# ============================================
# Prüfe ob PostgreSQL läuft
if ! sudo -u "$DB_USER" psql -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
    log_error "Database '$DB_NAME' not found!"
    send_alert "❌ Backup Failed" "Database '$DB_NAME' not found on $(hostname)"
    exit 1
fi

# Prüfe verfügbaren Speicherplatz
AVAILABLE_SPACE=$(df -BG "$BACKUP_DIR" | awk 'NR==2 {print $4}' | sed 's/G//')
if [ "$AVAILABLE_SPACE" -lt 5 ]; then
    log_error "Low disk space: ${AVAILABLE_SPACE}GB available"
    send_alert "⚠️  Low Disk Space" "Only ${AVAILABLE_SPACE}GB available for backups on $(hostname)"
fi

# ============================================
# BACKUP CREATION
# ============================================
START_TIME=$(date +%s)

log "Creating backup: $BACKUP_FILE"

# Erstelle Backup mit Custom Format (besser für große DBs)
if sudo -u "$DB_USER" pg_dump -Fc "$DB_NAME" > "$BACKUP_FILE.pgdump" 2>"$BACKUP_FILE.err"; then
    log "✅ Custom format backup created"
    CUSTOM_SUCCESS=true
else
    log_error "Custom format backup failed"
    CUSTOM_SUCCESS=false
fi

# Erstelle auch Plain SQL Backup (für manuelle Wiederherstellung)
if sudo -u "$DB_USER" pg_dump "$DB_NAME" > "$BACKUP_FILE" 2>>"$BACKUP_FILE.err"; then
    log "✅ SQL backup created"
    SQL_SUCCESS=true
else
    log_error "SQL backup failed"
    SQL_SUCCESS=false
fi

# Prüfe ob mindestens ein Backup erfolgreich war
if [ "$CUSTOM_SUCCESS" = false ] && [ "$SQL_SUCCESS" = false ]; then
    log_error "All backup methods failed!"
    if [ -f "$BACKUP_FILE.err" ]; then
        ERROR_MSG=$(cat "$BACKUP_FILE.err")
        log_error "Error details: $ERROR_MSG"
    fi
    send_alert "❌ Database Backup Failed" "All backup methods failed on $(hostname). Check logs at $LOG_FILE"
    exit 1
fi

# ============================================
# COMPRESSION
# ============================================
log "Compressing backups..."

if [ "$SQL_SUCCESS" = true ]; then
    gzip -f "$BACKUP_FILE"
    BACKUP_FILE="$BACKUP_FILE.gz"
fi

if [ "$CUSTOM_SUCCESS" = true ]; then
    gzip -f "$BACKUP_FILE.pgdump"
fi

# ============================================
# VERIFICATION
# ============================================
log "Verifying backup integrity..."

if [ -f "$BACKUP_FILE" ]; then
    # Teste ob gzip Datei korrekt ist
    if gzip -t "$BACKUP_FILE" 2>/dev/null; then
        BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
        log "✅ Backup verified: $BACKUP_FILE ($BACKUP_SIZE)"
    else
        log_error "Backup file is corrupted!"
        send_alert "❌ Backup Verification Failed" "Backup file corrupted on $(hostname)"
        exit 1
    fi
fi

# ============================================
# BACKUP ORGANIZATION
# ============================================
# Kopiere Backup in entsprechende Verzeichnisse
DAY_OF_WEEK=$(date +%u)  # 1=Monday, 7=Sunday
DAY_OF_MONTH=$(date +%d)

# Tägliches Backup
cp "$BACKUP_FILE" "$BACKUP_DIR/daily/"

# Wöchentliches Backup (jeden Sonntag)
if [ "$DAY_OF_WEEK" -eq 7 ]; then
    cp "$BACKUP_FILE" "$BACKUP_DIR/weekly/storedb-weekly-$TIMESTAMP.sql.gz"
    log "📅 Weekly backup created"
fi

# Monatliches Backup (am 1. des Monats)
if [ "$DAY_OF_MONTH" -eq 01 ]; then
    cp "$BACKUP_FILE" "$BACKUP_DIR/monthly/storedb-monthly-$TIMESTAMP.sql.gz"
    log "📅 Monthly backup created"
fi

# ============================================
# BACKUP ROTATION
# ============================================
log "🧹 Cleaning old backups..."

# Lösche alte tägliche Backups
DELETED_DAILY=$(find "$BACKUP_DIR/daily" -name "storedb-*.sql.gz" -mtime +$DAILY_RETENTION -delete -print | wc -l)
log "Deleted $DELETED_DAILY daily backups older than $DAILY_RETENTION days"

# Lösche alte wöchentliche Backups
DELETED_WEEKLY=$(find "$BACKUP_DIR/weekly" -name "storedb-*.sql.gz" -mtime +$WEEKLY_RETENTION -delete -print | wc -l)
log "Deleted $DELETED_WEEKLY weekly backups older than $WEEKLY_RETENTION days"

# Lösche alte monatliche Backups
DELETED_MONTHLY=$(find "$BACKUP_DIR/monthly" -name "storedb-*.sql.gz" -mtime +$MONTHLY_RETENTION -delete -print | wc -l)
log "Deleted $DELETED_MONTHLY monthly backups older than $MONTHLY_RETENTION days"

# Lösche alte Backups im Hauptverzeichnis
find "$BACKUP_DIR" -maxdepth 1 -name "storedb-*.sql.gz" -mtime +$DAILY_RETENTION -delete
find "$BACKUP_DIR" -maxdepth 1 -name "storedb-*.pgdump.gz" -mtime +$DAILY_RETENTION -delete

# ============================================
# STATISTICS
# ============================================
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

DAILY_COUNT=$(ls -1 "$BACKUP_DIR/daily"/storedb-*.sql.gz 2>/dev/null | wc -l)
WEEKLY_COUNT=$(ls -1 "$BACKUP_DIR/weekly"/storedb-*.sql.gz 2>/dev/null | wc -l)
MONTHLY_COUNT=$(ls -1 "$BACKUP_DIR/monthly"/storedb-*.sql.gz 2>/dev/null | wc -l)
TOTAL_COUNT=$((DAILY_COUNT + WEEKLY_COUNT + MONTHLY_COUNT))

TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)

log "📊 Backup Statistics:"
log "   Duration: ${DURATION}s"
log "   Backup size: $BACKUP_SIZE"
log "   Total backups: $TOTAL_COUNT (Daily: $DAILY_COUNT, Weekly: $WEEKLY_COUNT, Monthly: $MONTHLY_COUNT)"
log "   Total storage used: $TOTAL_SIZE"
log "   Disk space available: ${AVAILABLE_SPACE}GB"

# ============================================
# REMOTE BACKUP (Optional)
# ============================================
if [ -n "${REMOTE_BACKUP_PATH:-}" ]; then
    log "☁️  Uploading to remote storage..."

    # Beispiel für S3
    if command -v aws &> /dev/null; then
        aws s3 cp "$BACKUP_FILE" "$REMOTE_BACKUP_PATH/" && \
            log "✅ Remote backup uploaded to S3"
    fi

    # Beispiel für rsync
    if command -v rsync &> /dev/null && [ -n "${REMOTE_SERVER:-}" ]; then
        rsync -az "$BACKUP_FILE" "$REMOTE_SERVER:$REMOTE_BACKUP_PATH/" && \
            log "✅ Remote backup synced via rsync"
    fi
fi

# ============================================
# SUCCESS NOTIFICATION
# ============================================
log "✅ Backup completed successfully!"

# Sende Erfolgs-Benachrichtigung nur bei wichtigen Backups oder Problemen
if [ "$DAY_OF_WEEK" -eq 7 ] || [ "$DAY_OF_MONTH" -eq 01 ] || [ "$AVAILABLE_SPACE" -lt 10 ]; then
    send_alert "✅ Database Backup Success" "Backup completed on $(hostname): $BACKUP_SIZE, Duration: ${DURATION}s"
fi

# Cleanup
rm -f "$BACKUP_FILE.err"

exit 0
