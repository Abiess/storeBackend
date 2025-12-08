#!/usr/bin/env bash
# Database Reset Script - Löscht alle Tabellen und lässt Hibernate neu erstellen

set -euo pipefail

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-storedb}"
DB_USER="${DB_USER:-storeapp}"
DB_PASSWORD="${DB_PASSWORD:-}"

echo "=============================================="
echo "    Database Reset Script"
echo "=============================================="
echo ""
echo "⚠️  WARNUNG: Dieser Script löscht ALLE Tabellen!"
echo "    Datenbank: $DB_HOST:$DB_PORT/$DB_NAME"
echo ""
echo "Fahre in 3 Sekunden fort..."
sleep 3

# Setze Passwort für psql
export PGPASSWORD="$DB_PASSWORD"

echo "🗑️  Lösche alle Tabellen im public Schema..."

# Erstelle DROP-Statements für alle Tabellen
DROP_TABLES=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
SELECT 'DROP TABLE IF EXISTS \"' || tablename || '\" CASCADE;'
FROM pg_tables
WHERE schemaname = 'public';
" 2>/dev/null || echo "")

if [ -z "$DROP_TABLES" ]; then
    echo "✅ Keine Tabellen gefunden - Datenbank ist bereits leer"
else
    echo "Gefundene Tabellen werden gelöscht..."
    echo "$DROP_TABLES" | psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" 2>&1
    echo "✅ Alle Tabellen wurden gelöscht"
fi

echo ""
echo "📊 Überprüfe Datenbank-Status..."
TABLE_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public';" 2>/dev/null | tr -d ' ' || echo "0")

echo "   Verbleibende Tabellen: $TABLE_COUNT"

if [ "$TABLE_COUNT" -eq 0 ]; then
    echo ""
    echo "✅ Datenbank erfolgreich zurückgesetzt!"
    echo "   Starte nun die Anwendung neu, damit Hibernate die Tabellen erstellt."
    exit 0
else
    echo ""
    echo "⚠️  Warnung: Es gibt noch $TABLE_COUNT Tabelle(n)"
    exit 1
fi

