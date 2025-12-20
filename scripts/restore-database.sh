#!/bin/bash

# Database Restore Script
# Stellt ein Backup der PostgreSQL Datenbank wieder her

BACKUP_DIR="/opt/storebackend/backups/database"

echo "🔄 Store Backend - Database Restore"
echo "===================================="
echo ""

# Liste verfügbare Backups
echo "📋 Available backups:"
ls -lht $BACKUP_DIR/storedb-*.sql.gz 2>/dev/null | head -10

echo ""
echo "Enter the backup filename to restore (e.g., storedb-20250117-120000.sql.gz):"
read BACKUP_FILE

FULL_PATH="$BACKUP_DIR/$BACKUP_FILE"

if [ ! -f "$FULL_PATH" ]; then
    echo "❌ Backup file not found: $FULL_PATH"
    exit 1
fi

echo ""
echo "⚠️  WARNING: This will replace the current database!"
echo "Do you want to continue? (yes/no)"
read CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "❌ Restore cancelled"
    exit 0
fi

# Stoppe Application
echo "⏹️  Stopping application..."
sudo systemctl stop storebackend

# Backup der aktuellen DB
echo "💾 Creating backup of current database..."
sudo -u postgres pg_dump storedb > "$BACKUP_DIR/storedb-pre-restore-$(date +%Y%m%d-%H%M%S).sql"

# Restore
echo "🔄 Restoring database..."
gunzip -c "$FULL_PATH" | sudo -u postgres psql storedb

if [ $? -eq 0 ]; then
    echo "✅ Database restored successfully"

    # Starte Application
    echo "🚀 Starting application..."
    sudo systemctl start storebackend

    echo "✅ Restore completed!"
else
    echo "❌ Restore failed!"
    exit 1
fi
}

# SSL Configuration (wird von Certbot hinzugefügt)
# server {
#     listen 443 ssl http2;
#     server_name your-domain.com www.your-domain.com;
#
#     ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
#     ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
#     include /etc/letsencrypt/options-ssl-nginx.conf;
#     ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
#
#     # ... Rest der Configuration wie oben ...
# }

