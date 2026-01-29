#!/usr/bin/env bash
# Initialize Database Schema (SAFE)
# Führt init-schema.sql aus, aber nur wenn users Tabelle fehlt (Standard)
# Setze FORCE_INIT=true, wenn du es trotzdem erzwingen willst (ACHTUNG: dein init-schema.sql droppt Tabellen!)

set -euo pipefail

DB_NAME="${DB_NAME:-storedb}"
FORCE_INIT="${FORCE_INIT:-false}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SQL_FILE="$SCRIPT_DIR/init-schema.sql"

echo "=============================================="
echo "    Database Schema Initialization"
echo "=============================================="
echo "Database:  $DB_NAME"
echo "SQL File:  $SQL_FILE"
echo "Force:     $FORCE_INIT"
echo "Run as:    postgres (local)"
echo "=============================================="
echo ""

if [ ! -f "$SQL_FILE" ]; then
  echo "❌ SQL file not found: $SQL_FILE"
  exit 1
fi

echo "🔍 Checking if public.users exists..."
USERS_EXISTS=$(sudo -u postgres psql -d "$DB_NAME" -tAc "SELECT to_regclass('public.users');" | tr -d '[:space:]' || true)

if [ "$USERS_EXISTS" = "users" ] && [ "$FORCE_INIT" != "true" ]; then
  echo "✅ users table exists -> skipping init-schema.sql"
  exit 0
fi

if [ "$FORCE_INIT" = "true" ]; then
  echo "⚠️  FORCE_INIT=true -> Running init-schema.sql even if tables exist!"
  echo "⚠️  WARNING: Your init-schema.sql DROPs tables at the top."
fi

echo ""
echo "🗃️  Executing schema initialization..."
sudo -u postgres psql -v ON_ERROR_STOP=1 -d "$DB_NAME" -f "$SQL_FILE"

echo ""
echo "✅ Schema initialized successfully!"

TABLE_COUNT=$(sudo -u postgres psql -d "$DB_NAME" -tAc "SELECT COUNT(*) FROM pg_tables WHERE schemaname='public';" | tr -d '[:space:]' || echo "0")
echo "📊 Tables in public schema: $TABLE_COUNT"

echo "✅ Done."
