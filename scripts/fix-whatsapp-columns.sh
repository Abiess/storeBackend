#!/bin/bash
# ============================================================
# Fix: stores-Tabelle um whatsapp_number + whatsapp_notifications_enabled ergänzen
# Ausführen auf dem Produktions-Server:
#   bash scripts/fix-whatsapp-columns.sh
# ============================================================

set -e

# DB-Verbindung (Werte aus .env oder Umgebungsvariablen)
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-storebackend}"
DB_USER="${DB_USER:-postgres}"

echo "🔧 Füge WhatsApp-Spalten zur stores-Tabelle hinzu..."

psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" <<'SQL'

-- whatsapp_number (optional, VARCHAR)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'stores' AND column_name = 'whatsapp_number'
    ) THEN
        ALTER TABLE stores ADD COLUMN whatsapp_number VARCHAR(50);
        RAISE NOTICE '✅ stores.whatsapp_number hinzugefügt';
    ELSE
        RAISE NOTICE 'ℹ️  stores.whatsapp_number existiert bereits – übersprungen';
    END IF;
END $$;

-- whatsapp_notifications_enabled (NOT NULL DEFAULT FALSE)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'stores' AND column_name = 'whatsapp_notifications_enabled'
    ) THEN
        ALTER TABLE stores ADD COLUMN whatsapp_notifications_enabled BOOLEAN NOT NULL DEFAULT FALSE;
        RAISE NOTICE '✅ stores.whatsapp_notifications_enabled hinzugefügt';
    ELSE
        RAISE NOTICE 'ℹ️  stores.whatsapp_notifications_enabled existiert bereits – übersprungen';
    END IF;
END $$;

SQL

echo "✅ Migration abgeschlossen."

