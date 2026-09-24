#!/bin/bash
# ========================================
# Database Reset Script (NON-PRODUCTION ONLY!)
# ========================================
# Drops and recreates the database, then lets Hibernate recreate schema
# USE WITH EXTREME CAUTION - ALL DATA WILL BE LOST!

set -e

echo "========================================="
echo "⚠️  DATABASE RESET (NON-PROD ONLY)"
echo "========================================="
echo ""
echo "This will:"
echo "  1. Drop ALL data in storedb"
echo "  2. Drop and recreate the public schema"
echo "  3. Restart backend (Hibernate will recreate schema automatically)"
echo ""
echo "⚠️  ALL DATA WILL BE PERMANENTLY DELETED!"
echo ""

# Safety check
if [ "$1" != "--confirm" ]; then
  echo "❌ Safety check failed!"
  echo ""
  echo "Usage: $0 --confirm"
  echo ""
  echo "Example: sudo ./reset-database-no-flyway.sh --confirm"
  exit 1
fi

echo "🗑️  Dropping public schema..."

sudo -u postgres psql -d storedb <<EOF
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO storeapp;
GRANT ALL ON SCHEMA public TO public;
EOF

echo "✅ Schema dropped and recreated"
echo ""
echo "🔄 Restarting backend..."
echo "   (Hibernate will recreate schema from Entities)"
echo ""

sudo systemctl restart storebackend

echo "⏳ Waiting for backend to start..."
sleep 5

# Check if backend is healthy
if systemctl is-active --quiet storebackend; then
  echo ""
  echo "========================================="
  echo "✅ DATABASE RESET SUCCESSFUL"
  echo "========================================="
  echo ""
  echo "Backend is running and Hibernate has recreated the schema."
  echo "Initial data (Plans) will be created by DataInitializer."
  echo ""
else
  echo ""
  echo "⚠️  Backend start might need more time."
  echo "Check logs: sudo journalctl -u storebackend -n 50"
fi
  echo ""
  echo "Database is now empty with fresh schema"
  echo ""
else
  echo ""
  echo "❌ Schema application FAILED"
  exit 1
fi

