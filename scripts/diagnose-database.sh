#!/usr/bin/env bash
# Database Diagnostics Script for PostgreSQL
# Prüft ob Tabellen existieren und wo sie sind

set -euo pipefail

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-storedb}"
DB_USER="${DB_USER:-storeapp}"
DB_PASSWORD="${DB_PASSWORD:-}"

echo "==============================================="
echo "    PostgreSQL Database Diagnostics"
echo "==============================================="
echo ""
echo "Connecting to: $DB_HOST:$DB_PORT/$DB_NAME as $DB_USER"
echo ""

# Setze Passwort für psql
export PGPASSWORD="$DB_PASSWORD"

run_query() {
    local title="$1"
    local query="$2"

    echo "--- $title ---"
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "$query" 2>&1; then
        echo ""
    else
        echo "❌ Query fehlgeschlagen"
        echo ""
    fi
}

# 1. Alle Schemas anzeigen
run_query "1. Alle Schemas" \
    "SELECT nspname FROM pg_catalog.pg_namespace ORDER BY nspname;"

# 2. Alle Tabellen in allen Schemas
run_query "2. Alle Tabellen in allen Schemas" \
    "SELECT schemaname, tablename FROM pg_tables WHERE schemaname NOT IN ('pg_catalog', 'information_schema') ORDER BY schemaname, tablename;"

# 3. Suche nach 'domains' Tabelle
run_query "3. Suche nach 'domains' Tabelle" \
    "SELECT schemaname, tablename FROM pg_tables WHERE tablename LIKE '%domain%';"

# 4. Suche nach 'users' Tabelle
run_query "4. Suche nach 'users' Tabelle" \
    "SELECT schemaname, tablename FROM pg_tables WHERE tablename LIKE '%user%';"

# 5. Suche nach 'stores' Tabelle
run_query "5. Suche nach 'stores' Tabelle" \
    "SELECT schemaname, tablename FROM pg_tables WHERE tablename LIKE '%store%';"

# 6. Suche nach 'plans' Tabelle
run_query "6. Suche nach 'plans' Tabelle" \
    "SELECT schemaname, tablename FROM pg_tables WHERE tablename LIKE '%plan%';"

# 7. Aktuelles Default Schema
run_query "7. Aktuelles Default Schema (search_path)" \
    "SHOW search_path;"

# 8. Tabellen-Anzahl
run_query "8. Anzahl der Tabellen im public Schema" \
    "SELECT COUNT(*) as table_count FROM pg_tables WHERE schemaname = 'public';"

echo "==============================================="
echo "    Diagnose abgeschlossen"
echo "==============================================="
echo ""

# Prüfe ob Tabellen fehlen
TABLE_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public';" 2>/dev/null | tr -d ' ' || echo "0")

if [ "$TABLE_COUNT" -eq 0 ]; then
    echo "⚠️  WARNUNG: Keine Tabellen im 'public' Schema gefunden!"
    echo ""
    echo "Mögliche Ursachen:"
    echo "  1. ddl-auto=create wird nicht ausgeführt"
    echo "  2. Entity-Klassen werden nicht gescannt"
    echo "  3. Hibernate erstellt Tabellen in anderem Schema"
    echo "  4. Application ist noch nie erfolgreich gestartet"
    echo ""
    exit 1
else
    echo "✅ $TABLE_COUNT Tabelle(n) im 'public' Schema gefunden"
    exit 0
fi

