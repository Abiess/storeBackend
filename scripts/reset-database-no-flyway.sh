#!/bin/bash
# ========================================
# Database Reset Script (NON-PRODUCTION ONLY!)
# ========================================
# Drops and recreates the database, then applies schema.sql
# USE WITH EXTREME CAUTION - ALL DATA WILL BE LOST!

set -e

echo "========================================="
echo "⚠️  DATABASE RESET (NON-PROD ONLY)"
echo "========================================="
echo ""
echo "This will:"
echo "  1. Drop ALL data in storedb"
echo "  2. Drop and recreate the public schema"
echo "  3. Apply schema.sql"
echo ""
echo "⚠️  ALL DATA WILL BE PERMANENTLY DELETED!"
echo ""

# Safety check
if [ "$1" != "--confirm" ]; then
  echo "❌ Safety check failed!"
  echo ""
  echo "Usage: $0 --confirm"
  echo ""
  echo "Example: sudo -u postgres ./reset-database-no-flyway.sh --confirm"
  exit 1
fi

# Load DB password
if [ -f /etc/storebackend.env ]; then
  source /etc/storebackend.env
fi

DB_PASSWORD="${SPRING_DATASOURCE_PASSWORD:-postgres}"

echo "🗑️  Dropping public schema..."

sudo -u postgres psql -d storedb <<EOF
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO storeapp;
GRANT ALL ON SCHEMA public TO public;
EOF

echo "✅ Schema dropped and recreated"
echo ""
echo "📦 Applying schema.sql..."

PGPASSWORD="$DB_PASSWORD" psql -U storeapp -d storedb \
  -f /opt/storebackend/scripts/schema.sql \
  -v ON_ERROR_STOP=1

if [ $? -eq 0 ]; then
  echo ""
  echo "========================================="
  echo "✅ DATABASE RESET SUCCESSFUL"
  echo "========================================="
  echo ""
  echo "Database is now empty with fresh schema"
  echo ""
else
  echo ""
  echo "❌ Schema application FAILED"
  exit 1
fi

