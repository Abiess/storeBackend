#!/bin/bash
# ==================================================================================
# DIREKTER FIX: cart_items Spalten hinzufügen
# ==================================================================================
# Dieses Skript fügt die fehlenden created_at/updated_at Spalten direkt hinzu
# Ausführen: sudo -u postgres psql -d storedb -f /opt/storebackend/scripts/direct-fix-cart-items.sql
# ==================================================================================

echo "=========================================="
echo "🔧 DIREKTER FIX: cart_items Spalten"
echo "=========================================="

# Als postgres user ausführen
sudo -u postgres psql -d storedb << 'EOSQL'

-- Prüfe aktuelle Spalten
\echo '📋 Aktuelle cart_items Spalten:'
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'cart_items'
ORDER BY ordinal_position;

-- Füge created_at hinzu
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'cart_items'
        AND column_name = 'created_at'
    ) THEN
        ALTER TABLE cart_items ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;
        RAISE NOTICE '✅ Spalte created_at hinzugefügt';
    ELSE
        RAISE NOTICE '✅ Spalte created_at existiert bereits';
    END IF;
END $$;

-- Füge updated_at hinzu
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'cart_items'
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE cart_items ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;
        RAISE NOTICE '✅ Spalte updated_at hinzugefügt';
    ELSE
        RAISE NOTICE '✅ Spalte updated_at existiert bereits';
    END IF;
END $$;

-- Verifizierung
\echo ''
\echo '📋 Neue cart_items Spalten:'
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'cart_items'
ORDER BY ordinal_position;

\echo ''
\echo '✅ Fix abgeschlossen!'

EOSQL

echo "=========================================="
echo "✅ Skript abgeschlossen"
echo "Nächster Schritt: sudo systemctl restart storebackend"
echo "=========================================="

