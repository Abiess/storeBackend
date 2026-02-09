#!/bin/bash
# ==================================================================================
# CHECK CART_ITEMS COLUMNS
# ==================================================================================
# Überprüft, ob cart_items die benötigten Spalten hat
# ==================================================================================

echo "=========================================="
echo "📋 CART_ITEMS SPALTEN-CHECK"
echo "=========================================="

sudo -u postgres psql -d storedb << 'EOSQL'

\echo '1. Alle Spalten in cart_items:'
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'cart_items'
ORDER BY ordinal_position;

\echo ''
\echo '2. Anzahl Spalten in cart_items:'
SELECT COUNT(*) as column_count
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'cart_items';

\echo ''
\echo '3. Prüfe ob created_at existiert:'
SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'cart_items'
    AND column_name = 'created_at'
) as created_at_exists;

\echo ''
\echo '4. Prüfe ob updated_at existiert:'
SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'cart_items'
    AND column_name = 'updated_at'
) as updated_at_exists;

EOSQL

echo ""
echo "=========================================="
echo "📋 LETZTE 50 ZEILEN DER LOGS (mit Schema-Fehlern)"
echo "=========================================="
sudo journalctl -u storebackend --no-pager -n 50 | grep -A 5 -B 5 "schema\|Schema\|created_at\|cart_items" || echo "Keine Schema-Fehler gefunden"

echo ""
echo "=========================================="
echo "📋 HIBERNATE VALIDATION ERRORS"
echo "=========================================="
sudo journalctl -u storebackend --no-pager -n 100 | grep -A 10 "SchemaManagementException\|Schema-validation" || echo "Keine Hibernate Schema-Validation Fehler"

echo ""
echo "=========================================="
echo "✅ Check abgeschlossen"
echo "=========================================="

