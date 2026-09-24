#!/bin/bash

# ============================================
# Backup Cron Job Setup Script
# ============================================
# Richtet automatische Backups mit Cron ein

set -euo pipefail

echo "🕒 Setting up automatic backup schedule..."
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_SCRIPT="$SCRIPT_DIR/backup-database.sh"
CRON_USER="${CRON_USER:-root}"

# Prüfe ob Backup-Script existiert
if [ ! -f "$BACKUP_SCRIPT" ]; then
    echo "❌ Backup script not found: $BACKUP_SCRIPT"
    exit 1
fi

# Mache Script ausführbar
chmod +x "$BACKUP_SCRIPT"

# ============================================
# BACKUP SCHEDULE
# ============================================
echo "📅 Backup Schedule Options:"
echo ""
echo "1) Täglich um 2:00 Uhr morgens (empfohlen)"
echo "2) Täglich um 3:00 Uhr morgens"
echo "3) Alle 6 Stunden"
echo "4) Alle 12 Stunden"
echo "5) Benutzerdefiniert"
echo ""
echo "Wähle eine Option (1-5):"
read -r SCHEDULE_OPTION

case $SCHEDULE_OPTION in
    1)
        CRON_SCHEDULE="0 2 * * *"
        DESCRIPTION="Daily at 2:00 AM"
        ;;
    2)
        CRON_SCHEDULE="0 3 * * *"
        DESCRIPTION="Daily at 3:00 AM"
        ;;
    3)
        CRON_SCHEDULE="0 */6 * * *"
        DESCRIPTION="Every 6 hours"
        ;;
    4)
        CRON_SCHEDULE="0 */12 * * *"
        DESCRIPTION="Every 12 hours"
        ;;
    5)
        echo "Gib den Cron-Ausdruck ein (z.B. '0 2 * * *'):"
        read -r CRON_SCHEDULE
        DESCRIPTION="Custom schedule: $CRON_SCHEDULE"
        ;;
    *)
        echo "❌ Ungültige Option"
        exit 1
        ;;
esac

# ============================================
# CONFIGURATION
# ============================================
echo ""
echo "📧 E-Mail-Benachrichtigungen:"
echo "Gib eine E-Mail-Adresse für Benachrichtigungen ein (oder Enter zum Überspringen):"
read -r ALERT_EMAIL

# Erstelle Wrapper-Script mit Umgebungsvariablen
WRAPPER_SCRIPT="/usr/local/bin/backup-storedb"
cat > "$WRAPPER_SCRIPT" << EOF
#!/bin/bash
# Auto-generated backup wrapper script

# Environment variables
export BACKUP_DIR=/opt/storebackend/backups/database
export DB_NAME=storedb
export DB_USER=postgres
export ALERT_EMAIL=${ALERT_EMAIL:-admin@localhost}
export WEBHOOK_URL=${WEBHOOK_URL:-}
export REMOTE_BACKUP_PATH=${REMOTE_BACKUP_PATH:-}
export REMOTE_SERVER=${REMOTE_SERVER:-}

# Run backup script
$BACKUP_SCRIPT
EOF

chmod +x "$WRAPPER_SCRIPT"

# ============================================
# INSTALL CRON JOB
# ============================================
echo ""
echo "📝 Installing cron job..."

# Backup existing crontab
if crontab -u "$CRON_USER" -l > /tmp/crontab.backup 2>/dev/null; then
    echo "✅ Existing crontab backed up to /tmp/crontab.backup"
fi

# Entferne alte Backup-Jobs falls vorhanden
crontab -u "$CRON_USER" -l 2>/dev/null | grep -v "backup-storedb" | grep -v "backup-database.sh" > /tmp/crontab.new || true

# Füge neuen Backup-Job hinzu
echo "" >> /tmp/crontab.new
echo "# StoreBackend Database Backup - $DESCRIPTION" >> /tmp/crontab.new
echo "$CRON_SCHEDULE $WRAPPER_SCRIPT >> /var/log/storebackend/backup-cron.log 2>&1" >> /tmp/crontab.new

# Installiere neue Crontab
crontab -u "$CRON_USER" /tmp/crontab.new

echo "✅ Cron job installed successfully!"
echo ""

# ============================================
# VERIFY INSTALLATION
# ============================================
echo "📋 Current backup schedule:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
crontab -u "$CRON_USER" -l | grep -A 1 "StoreBackend Database Backup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ============================================
# TEST BACKUP
# ============================================
echo ""
echo "🧪 Test-Backup durchführen? (yes/no)"
read -r TEST_BACKUP

if [ "$TEST_BACKUP" = "yes" ]; then
    echo ""
    echo "Running test backup..."
    $WRAPPER_SCRIPT
fi

# ============================================
# SUMMARY
# ============================================
echo ""
echo "✅ Backup automation setup complete!"
echo ""
echo "📊 Configuration:"
echo "   Schedule: $DESCRIPTION"
echo "   Script: $WRAPPER_SCRIPT"
echo "   Log: /var/log/storebackend/backup-cron.log"
if [ -n "$ALERT_EMAIL" ]; then
    echo "   Alerts: $ALERT_EMAIL"
fi
echo ""
echo "💡 Useful commands:"
echo "   View schedule:  crontab -u $CRON_USER -l"
echo "   View logs:      tail -f /var/log/storebackend/backup.log"
echo "   View cron logs: tail -f /var/log/storebackend/backup-cron.log"
echo "   Manual backup:  $WRAPPER_SCRIPT"
echo ""

exit 0

