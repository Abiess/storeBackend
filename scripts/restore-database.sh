#!/bin/bash

# ============================================
# Database Restore Script - Enhanced Version
# ============================================
# Stellt ein Backup der PostgreSQL Datenbank wieder her
# mit Sicherheitsprüfungen und automatischem Rollback

set -euo pipefail

# ============================================
# CONFIGURATION
# ============================================
BACKUP_DIR="${BACKUP_DIR:-/opt/storebackend/backups/database}"
DB_NAME="${DB_NAME:-storedb}"
DB_USER="${DB_USER:-postgres}"
LOG_FILE="/var/log/storebackend/restore.log"
SERVICE_NAME="storebackend"

# ============================================
# LOGGING FUNCTIONS
# ============================================
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1" | tee -a "$LOG_FILE" >&2
}

# ============================================
# MAIN SCRIPT
# ============================================
echo "🔄 Store Backend - Database Restore"
echo "===================================="
echo ""

# Prüfe ob Log-Verzeichnis existiert
mkdir -p "$(dirname "$LOG_FILE")"
log "Starting database restore process"

# ============================================
# BACKUP SELECTION
# ============================================
echo "📋 Available backups:"
echo ""
echo "Daily Backups (last 7):"
ls -lht "$BACKUP_DIR/daily"/storedb-*.sql.gz 2>/dev/null | head -7 | awk '{print "  " $9 " (" $5 ", " $6 " " $7 " " $8 ")"}'

echo ""
echo "Weekly Backups:"
ls -lht "$BACKUP_DIR/weekly"/storedb-*.sql.gz 2>/dev/null | head -5 | awk '{print "  " $9 " (" $5 ", " $6 " " $7 " " $8 ")"}'

echo ""
echo "Monthly Backups:"
ls -lht "$BACKUP_DIR/monthly"/storedb-*.sql.gz 2>/dev/null | head -5 | awk '{print "  " $9 " (" $5 ", " $6 " " $7 " " $8 ")"}'

echo ""
echo "Other Backups:"
ls -lht "$BACKUP_DIR"/storedb-*.sql.gz 2>/dev/null | head -5 | awk '{print "  " $9 " (" $5 ", " $6 " " $7 " " $8 ")"}'

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Enter the FULL PATH to the backup file to restore:"
echo "(or just the filename if it's in the backup directory)"
read -r BACKUP_INPUT

# Bestimme den vollständigen Pfad
if [ -f "$BACKUP_INPUT" ]; then
    FULL_PATH="$BACKUP_INPUT"
elif [ -f "$BACKUP_DIR/$BACKUP_INPUT" ]; then
    FULL_PATH="$BACKUP_DIR/$BACKUP_INPUT"
elif [ -f "$BACKUP_DIR/daily/$BACKUP_INPUT" ]; then
    FULL_PATH="$BACKUP_DIR/daily/$BACKUP_INPUT"
elif [ -f "$BACKUP_DIR/weekly/$BACKUP_INPUT" ]; then
    FULL_PATH="$BACKUP_DIR/weekly/$BACKUP_INPUT"
elif [ -f "$BACKUP_DIR/monthly/$BACKUP_INPUT" ]; then
    FULL_PATH="$BACKUP_DIR/monthly/$BACKUP_INPUT"
else
    log_error "Backup file not found: $BACKUP_INPUT"
    echo "❌ Backup file not found!"
    exit 1
fi

log "Selected backup: $FULL_PATH"

# ============================================
# BACKUP VERIFICATION
# ============================================
echo ""
echo "🔍 Verifying backup integrity..."

# Prüfe ob die Datei komprimiert ist
if [[ "$FULL_PATH" == *.gz ]]; then
    if ! gzip -t "$FULL_PATH" 2>/dev/null; then
        log_error "Backup file is corrupted: $FULL_PATH"
        echo "❌ Backup file is corrupted! Cannot proceed."
        exit 1
    fi
    echo "✅ Backup integrity verified"
else
    echo "⚠️  Warning: Backup is not compressed"
fi

# Zeige Backup-Informationen
BACKUP_SIZE=$(du -h "$FULL_PATH" | cut -f1)
BACKUP_DATE=$(stat -c %y "$FULL_PATH" 2>/dev/null || stat -f %Sm "$FULL_PATH" 2>/dev/null)

echo ""
echo "📦 Backup Information:"
echo "   File: $(basename "$FULL_PATH")"
echo "   Size: $BACKUP_SIZE"
echo "   Date: $BACKUP_DATE"

# ============================================
# CONFIRMATION
# ============================================
echo ""
echo "⚠️  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⚠️  WARNING: This will REPLACE the current database!"
echo "⚠️  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Current database will be backed up before restore."
echo ""
echo "Type 'yes' to continue or anything else to cancel:"
read -r CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    log "Restore cancelled by user"
    echo "❌ Restore cancelled"
    exit 0
fi

log "Restore confirmed by user"

# ============================================
# PRE-RESTORE BACKUP
# ============================================
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
PRE_RESTORE_BACKUP="$BACKUP_DIR/storedb-pre-restore-$TIMESTAMP.sql.gz"

echo ""
echo "💾 Creating safety backup of current database..."
log "Creating pre-restore backup: $PRE_RESTORE_BACKUP"

if sudo -u "$DB_USER" pg_dump "$DB_NAME" | gzip > "$PRE_RESTORE_BACKUP"; then
    SAFETY_BACKUP_SIZE=$(du -h "$PRE_RESTORE_BACKUP" | cut -f1)
    echo "✅ Safety backup created: $SAFETY_BACKUP_SIZE"
    log "Safety backup created successfully: $PRE_RESTORE_BACKUP ($SAFETY_BACKUP_SIZE)"
else
    log_error "Failed to create safety backup"
    echo "❌ Failed to create safety backup! Aborting."
    exit 1
fi

# ============================================
# STOP APPLICATION
# ============================================
echo ""
echo "⏹️  Stopping application..."
log "Stopping service: $SERVICE_NAME"

if systemctl is-active --quiet "$SERVICE_NAME"; then
    if sudo systemctl stop "$SERVICE_NAME"; then
        echo "✅ Application stopped"
        log "Service stopped successfully"
        SERVICE_WAS_RUNNING=true
    else
        log_error "Failed to stop service"
        echo "⚠️  Warning: Could not stop application service"
        SERVICE_WAS_RUNNING=false
    fi
else
    echo "ℹ️  Application was not running"
    log "Service was not running"
    SERVICE_WAS_RUNNING=false
fi

# Warte kurz, damit Verbindungen geschlossen werden
sleep 2

# ============================================
# TERMINATE DATABASE CONNECTIONS
# ============================================
echo ""
echo "🔌 Terminating active database connections..."
log "Terminating connections to database: $DB_NAME"

sudo -u "$DB_USER" psql -c "SELECT pg_terminate_backend(pg_stat_activity.pid)
FROM pg_stat_activity
WHERE pg_stat_activity.datname = '$DB_NAME'
AND pid <> pg_backend_pid();" 2>/dev/null || true

echo "✅ Connections terminated"

# ============================================
# RESTORE DATABASE
# ============================================
echo ""
echo "🔄 Restoring database..."
log "Starting database restore from: $FULL_PATH"

START_TIME=$(date +%s)

# Bestimme ob es ein Custom Format oder SQL Format ist
if [[ "$FULL_PATH" == *.pgdump.gz ]]; then
    # Custom Format
    log "Restoring from custom format backup"
    if gunzip -c "$FULL_PATH" | sudo -u "$DB_USER" pg_restore -d "$DB_NAME" --clean --if-exists 2>&1 | tee -a "$LOG_FILE"; then
        RESTORE_SUCCESS=true
    else
        RESTORE_SUCCESS=false
    fi
else
    # SQL Format
    log "Restoring from SQL backup"
    if gunzip -c "$FULL_PATH" | sudo -u "$DB_USER" psql "$DB_NAME" 2>&1 | tee -a "$LOG_FILE"; then
        RESTORE_SUCCESS=true
    else
        RESTORE_SUCCESS=false
    fi
fi

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

# ============================================
# CHECK RESTORE SUCCESS
# ============================================
if [ "$RESTORE_SUCCESS" = true ]; then
    echo ""
    echo "✅ Database restored successfully!"
    log "Database restore completed successfully in ${DURATION}s"

    # Verify database
    echo ""
    echo "🔍 Verifying database..."
    TABLE_COUNT=$(sudo -u "$DB_USER" psql -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | tr -d ' ')
    echo "✅ Database contains $TABLE_COUNT tables"
    log "Database verification: $TABLE_COUNT tables found"

else
    echo ""
    echo "❌ Database restore FAILED!"
    log_error "Database restore failed after ${DURATION}s"

    # Rollback
    echo ""
    echo "🔄 Rolling back to safety backup..."
    log "Attempting rollback to: $PRE_RESTORE_BACKUP"

    if gunzip -c "$PRE_RESTORE_BACKUP" | sudo -u "$DB_USER" psql "$DB_NAME" 2>&1 | tee -a "$LOG_FILE"; then
        echo "✅ Rollback successful - database restored to previous state"
        log "Rollback successful"
    else
        echo "❌ Rollback FAILED! Database may be in inconsistent state!"
        log_error "Rollback failed - manual intervention required"
    fi

    # Restart application if it was running
    if [ "$SERVICE_WAS_RUNNING" = true ]; then
        echo "🚀 Starting application..."
        sudo systemctl start "$SERVICE_NAME"
    fi

    exit 1
fi

# ============================================
# RESTART APPLICATION
# ============================================
if [ "$SERVICE_WAS_RUNNING" = true ]; then
    echo ""
    echo "🚀 Starting application..."
    log "Starting service: $SERVICE_NAME"

    if sudo systemctl start "$SERVICE_NAME"; then
        echo "✅ Application started"
        log "Service started successfully"

        # Warte und prüfe Status
        sleep 3
        if systemctl is-active --quiet "$SERVICE_NAME"; then
            echo "✅ Application is running"
            log "Service is running and healthy"
        else
            echo "⚠️  Warning: Application may not have started correctly"
            log_error "Service may not be running properly"
        fi
    else
        echo "❌ Failed to start application!"
        log_error "Failed to start service"
    fi
fi

# ============================================
# SUMMARY
# ============================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Restore completed successfully!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "   Restored from: $(basename "$FULL_PATH")"
echo "   Duration: ${DURATION}s"
echo "   Tables: $TABLE_COUNT"
echo "   Safety backup: $(basename "$PRE_RESTORE_BACKUP")"
echo ""
log "Restore process completed successfully"

exit 0
