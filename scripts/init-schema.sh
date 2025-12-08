#!/usr/bin/env bash
# Initialize Database Schema
# Führt das SQL-Schema-Script aus

set -euo pipefail

DB_NAME="${DB_NAME:-storedb}"

SCRIPT_DIR="$(dirname "$0")"
SQL_FILE="$SCRIPT_DIR/init-schema.sql"

echo "=============================================="
echo "    Database Schema Initialization"
echo "=============================================="
echo ""
echo "Database: $DB_NAME (local connection as postgres)"
echo "SQL File: $SQL_FILE"
echo ""

if [ ! -f "$SQL_FILE" ]; then
    echo "❌ SQL file not found: $SQL_FILE"
    exit 1
fi

echo "🗃️  Executing schema initialization..."
# Run as postgres user locally (peer authentication, no password needed)
if sudo -u postgres psql -d "$DB_NAME" -f "$SQL_FILE"; then
    echo ""
    echo "✅ Schema initialized successfully!"

    # Prüfe Tabellen
    TABLE_COUNT=$(sudo -u postgres psql -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public';" 2>/dev/null | tr -d ' ')
    echo "📊 Created $TABLE_COUNT tables"

    exit 0
else
    echo ""
    echo "❌ Schema initialization failed!"
    exit 1
fi
