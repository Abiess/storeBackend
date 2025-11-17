#!/bin/bash

# Database Backup Script
# Erstellt ein Backup der PostgreSQL Datenbank

BACKUP_DIR="/opt/storebackend/backups/database"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="$BACKUP_DIR/storedb-$TIMESTAMP.sql"

# Erstelle Backup-Verzeichnis falls nicht vorhanden
mkdir -p $BACKUP_DIR

echo "🗄️  Creating database backup..."

# Backup erstellen
sudo -u postgres pg_dump storedb > $BACKUP_FILE

if [ $? -eq 0 ]; then
    # Komprimieren
    gzip $BACKUP_FILE
    echo "✅ Backup created: $BACKUP_FILE.gz"

    # Größe anzeigen
    SIZE=$(du -h "$BACKUP_FILE.gz" | cut -f1)
    echo "📦 Backup size: $SIZE"

    # Alte Backups löschen (älter als 30 Tage)
    find $BACKUP_DIR -name "storedb-*.sql.gz" -mtime +30 -delete
    echo "🧹 Old backups cleaned up"

    # Anzahl verfügbarer Backups
    COUNT=$(ls -1 $BACKUP_DIR/storedb-*.sql.gz 2>/dev/null | wc -l)
    echo "📊 Total backups available: $COUNT"
else
    echo "❌ Backup failed!"
    exit 1
fi

