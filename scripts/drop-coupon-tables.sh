#!/bin/bash
# Drop existing coupon tables to allow fresh V17 migration
# Safe to run - no production data

set -e

echo "=========================================="
echo "Dropping existing coupon tables"
echo "=========================================="
echo ""

echo "⚠️  This will delete all coupon data!"
echo ""

sudo -u postgres psql -d storedb << 'EOF'
-- Drop coupon tables in correct order (respecting FK constraints)
DROP TABLE IF EXISTS coupon_redemptions CASCADE;
DROP TABLE IF EXISTS coupon_domain_ids CASCADE;
DROP TABLE IF EXISTS coupon_customer_emails CASCADE;
DROP TABLE IF EXISTS coupon_collection_ids CASCADE;
DROP TABLE IF EXISTS coupon_category_ids CASCADE;
DROP TABLE IF EXISTS coupon_product_ids CASCADE;
DROP TABLE IF EXISTS coupons CASCADE;

-- Remove V17 from Flyway history to allow re-run
DELETE FROM flyway_schema_history WHERE version = '17';

EOF

echo ""
echo "✅ Coupon tables dropped successfully"
echo "✅ V17 migration removed from Flyway history"
echo ""
echo "Next deployment will run V17 migration fresh!"
echo "=========================================="

