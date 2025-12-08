#!/usr/bin/env bash
# Grant Database Permissions Script
# Gibt dem storeapp User die nötigen Berechtigungen für das public Schema

set -euo pipefail

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-storedb}"
DB_ADMIN_USER="${DB_ADMIN_USER:-postgres}"
DB_APP_USER="${DB_APP_USER:-storeapp}"

SCRIPT_DIR="$(dirname "$0")"
SQL_FILE="$SCRIPT_DIR/grant-permissions.sql"

echo "=============================================="
echo "    Grant Database Permissions"
echo "=============================================="
echo ""
echo "Database: $DB_HOST:$DB_PORT/$DB_NAME"
echo "Admin User: $DB_ADMIN_USER"
echo "App User: $DB_APP_USER"
echo ""

if [ ! -f "$SQL_FILE" ]; then
    echo "❌ SQL file not found: $SQL_FILE"
    exit 1
fi

# Note: This needs to run as postgres superuser
# For production, you may need to provide postgres password via PGPASSWORD_ADMIN

echo "🔐 Granting permissions to $DB_APP_USER..."

# Run as postgres superuser
if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_ADMIN_USER" -d "$DB_NAME" -f "$SQL_FILE"; then
    echo ""
    echo "✅ Permissions granted successfully!"
    exit 0
else
    echo ""
    echo "❌ Failed to grant permissions!"
    echo "    Make sure you're running this as postgres superuser."
    exit 1
fi

