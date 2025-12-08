#!/usr/bin/env bash
# Initialize Database Schema
# Führt das SQL-Schema-Script aus

set -euo pipefail

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-storedb}"
DB_USER="${DB_USER:-storeapp}"
DB_PASSWORD="${DB_PASSWORD:-}"

SCRIPT_DIR="$(dirname "$0")"
SQL_FILE="$SCRIPT_DIR/init-schema.sql"

echo "=============================================="
echo "    Database Schema Initialization"
echo "=============================================="
echo ""
echo "Database: $DB_HOST:$DB_PORT/$DB_NAME"
echo "SQL File: $SQL_FILE"
echo ""

if [ ! -f "$SQL_FILE" ]; then
    echo "❌ SQL file not found: $SQL_FILE"
    exit 1
fi

export PGPASSWORD="$DB_PASSWORD"

echo "🗃️  Executing schema initialization..."
if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$SQL_FILE"; then
    echo ""
    echo "✅ Schema initialized successfully!"

    # Prüfe Tabellen
    TABLE_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public';" 2>/dev/null | tr -d ' ')
    echo "📊 Created $TABLE_COUNT tables"

    exit 0
else
    echo ""
    echo "❌ Schema initialization failed!"
    exit 1
fi

