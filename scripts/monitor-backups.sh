#!/bin/bash

# ============================================
# Backup Monitoring Script
# ============================================
# Überwacht Backup-Status und sendet Warnungen bei Problemen

set -euo pipefail

# ============================================
# CONFIGURATION
# ============================================
BACKUP_DIR="${BACKUP_DIR:-/opt/storebackend/backups/database}"
LOG_FILE="/var/log/storebackend/backup.log"
ALERT_EMAIL="${ALERT_EMAIL:-admin@localhost}"
WEBHOOK_URL="${WEBHOOK_URL:-}"

# Schwellenwerte
MAX_BACKUP_AGE_HOURS=26  # Warnung wenn letztes Backup älter als 26 Stunden
MIN_DISK_SPACE_GB=10     # Warnung wenn weniger als 10GB frei
MIN_BACKUP_COUNT=3       # Warnung wenn weniger als 3 Backups vorhanden

# ============================================
# FUNCTIONS
# ============================================
send_alert() {
    local subject="$1"
    local message="$2"
    local severity="${3:-WARNING}"

    echo "[$severity] $subject: $message"

    # E-Mail
    if command -v mail &> /dev/null; then
        echo "$message" | mail -s "[$severity] $subject" "$ALERT_EMAIL"
    fi

    # Webhook
    if [ -n "$WEBHOOK_URL" ]; then
        local emoji="⚠️"
        [ "$severity" = "CRITICAL" ] && emoji="🚨"
        [ "$severity" = "OK" ] && emoji="✅"

        curl -X POST -H 'Content-Type: application/json' \
            -d "{\"text\":\"$emoji [$severity] $subject: $message\"}" \
            "$WEBHOOK_URL" 2>/dev/null || true
    fi
}

check_backup_age() {
    local latest_backup=$(find "$BACKUP_DIR" -name "storedb-*.sql.gz" -type f -printf '%T@ %p\n' 2>/dev/null | sort -rn | head -1 | cut -d' ' -f2-)

    if [ -z "$latest_backup" ]; then
        send_alert "No Backups Found" "No database backups exist in $BACKUP_DIR" "CRITICAL"
        return 1
    fi

    local backup_age_seconds=$(( $(date +%s) - $(stat -c %Y "$latest_backup" 2>/dev/null || stat -f %m "$latest_backup" 2>/dev/null) ))
    local backup_age_hours=$(( backup_age_seconds / 3600 ))

    if [ $backup_age_hours -gt $MAX_BACKUP_AGE_HOURS ]; then
        send_alert "Backup Too Old" "Latest backup is $backup_age_hours hours old (threshold: $MAX_BACKUP_AGE_HOURS hours)" "CRITICAL"
        return 1
    fi

    echo "✅ Backup age: $backup_age_hours hours (OK)"
    return 0
}

check_disk_space() {
    local available_space=$(df -BG "$BACKUP_DIR" | awk 'NR==2 {print $4}' | sed 's/G//')

    if [ "$available_space" -lt "$MIN_DISK_SPACE_GB" ]; then
        send_alert "Low Disk Space" "Only ${available_space}GB available (threshold: ${MIN_DISK_SPACE_GB}GB)" "CRITICAL"
        return 1
    fi

    echo "✅ Disk space: ${available_space}GB available (OK)"
    return 0
}

check_backup_count() {
    local daily_count=$(ls -1 "$BACKUP_DIR/daily"/storedb-*.sql.gz 2>/dev/null | wc -l)
    local total_count=$(find "$BACKUP_DIR" -name "storedb-*.sql.gz" -type f | wc -l)

    if [ $total_count -lt $MIN_BACKUP_COUNT ]; then
        send_alert "Insufficient Backups" "Only $total_count backups available (threshold: $MIN_BACKUP_COUNT)" "WARNING"
        return 1
    fi

    echo "✅ Backup count: $total_count total, $daily_count daily (OK)"
    return 0
}

check_backup_integrity() {
    local latest_backup=$(find "$BACKUP_DIR" -name "storedb-*.sql.gz" -type f -printf '%T@ %p\n' 2>/dev/null | sort -rn | head -1 | cut -d' ' -f2-)

    if [ -z "$latest_backup" ]; then
        return 1
    fi

    if ! gzip -t "$latest_backup" 2>/dev/null; then
        send_alert "Backup Corrupted" "Latest backup file is corrupted: $(basename "$latest_backup")" "CRITICAL"
        return 1
    fi

    echo "✅ Backup integrity: Latest backup is valid (OK)"
    return 0
}

check_log_errors() {
    if [ ! -f "$LOG_FILE" ]; then
        echo "⚠️  Log file not found: $LOG_FILE"
        return 0
    fi

    # Prüfe auf Fehler in den letzten 24 Stunden
    local errors=$(grep -i "ERROR" "$LOG_FILE" | grep "$(date +%Y-%m-%d)" | wc -l)

    if [ $errors -gt 0 ]; then
        local last_error=$(grep -i "ERROR" "$LOG_FILE" | tail -1)
        send_alert "Backup Errors Detected" "$errors error(s) found in logs. Last: $last_error" "WARNING"
        return 1
    fi

    echo "✅ Log check: No errors in recent logs (OK)"
    return 0
}

get_backup_statistics() {
    echo ""
    echo "📊 Backup Statistics"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    # Anzahl Backups
    local daily=$(ls -1 "$BACKUP_DIR/daily"/storedb-*.sql.gz 2>/dev/null | wc -l)
    local weekly=$(ls -1 "$BACKUP_DIR/weekly"/storedb-*.sql.gz 2>/dev/null | wc -l)
    local monthly=$(ls -1 "$BACKUP_DIR/monthly"/storedb-*.sql.gz 2>/dev/null | wc -l)
    local total=$(find "$BACKUP_DIR" -name "storedb-*.sql.gz" -type f | wc -l)

    echo "Backups: $total total ($daily daily, $weekly weekly, $monthly monthly)"

    # Größen
    local total_size=$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1)
    echo "Total size: $total_size"

    # Neuestes Backup
    local latest=$(find "$BACKUP_DIR" -name "storedb-*.sql.gz" -type f -printf '%T@ %p\n' 2>/dev/null | sort -rn | head -1 | cut -d' ' -f2-)
    if [ -n "$latest" ]; then
        local age=$(( ($(date +%s) - $(stat -c %Y "$latest" 2>/dev/null || stat -f %m "$latest" 2>/dev/null)) / 3600 ))
        local size=$(du -h "$latest" | cut -f1)
        echo "Latest backup: $(basename "$latest") (${age}h old, $size)"
    fi

    # Speicherplatz
    local available=$(df -BG "$BACKUP_DIR" | awk 'NR==2 {print $4}' | sed 's/G//')
    local used=$(df -BG "$BACKUP_DIR" | awk 'NR==2 {print $3}' | sed 's/G//')
    echo "Disk usage: ${used}GB used, ${available}GB available"

    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

# ============================================
# MAIN
# ============================================
echo "🔍 Store Backend - Backup Monitoring"
echo "===================================="
echo ""
echo "Checking backup health..."
echo ""

ISSUES=0

# Führe alle Checks durch
check_backup_age || ((ISSUES++))
check_disk_space || ((ISSUES++))
check_backup_count || ((ISSUES++))
check_backup_integrity || ((ISSUES++))
check_log_errors || ((ISSUES++))

# Statistiken anzeigen
get_backup_statistics

# Zusammenfassung
echo ""
if [ $ISSUES -eq 0 ]; then
    echo "✅ All backup checks passed!"
    exit 0
else
    echo "⚠️  $ISSUES issue(s) detected!"
    exit 1
fi

