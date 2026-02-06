#!/bin/bash
# Extract detailed SQL error from server logs

echo "=========================================="
echo "Checking Server Logs for SQL Error Details"
echo "=========================================="
echo ""

# Get the last 500 lines and show detailed Flyway errors
echo "Searching for detailed Flyway migration errors..."
sudo journalctl -u storebackend -n 500 --no-pager | grep -B 10 -A 20 "Migration V17.*failed\|FlywayException\|PSQLException\|SQLException" | tail -50

echo ""
echo "=========================================="
echo "Last 100 Lines of Server Logs"
echo "=========================================="
sudo journalctl -u storebackend -n 100 --no-pager | tail -50

echo ""
echo "=========================================="
echo "Checking Flyway Schema History"
echo "=========================================="
sudo -u postgres psql -d storedb -c "SELECT version, description, type, script, checksum, installed_on, execution_time, success FROM flyway_schema_history ORDER BY installed_rank DESC LIMIT 5;"

echo ""
echo "=========================================="
echo "Checking if V17 is partially applied"
echo "=========================================="
sudo -u postgres psql -d storedb -c "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'coupons') as coupons_exists;"

echo ""
echo "Checking coupons table structure..."
sudo -u postgres psql -d storedb -c "\d coupons" 2>&1 | head -30

echo ""
echo "=========================================="
echo "Checking all coupon-related tables"
echo "=========================================="
sudo -u postgres psql -d storedb -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE '%coupon%' ORDER BY table_name;"

echo ""
echo "=========================================="
echo "Checking for constraint conflicts"
echo "=========================================="
sudo -u postgres psql -d storedb -c "SELECT conname, conrelid::regclass, confrelid::regclass FROM pg_constraint WHERE conname LIKE '%coupon%';"

echo ""
echo "=========================================="
echo "Validating V17 SQL Syntax Locally"
echo "=========================================="
echo "Attempting to validate V17 migration SQL..."
sudo -u postgres psql -d storedb --single-transaction --set ON_ERROR_STOP=on -f /opt/storebackend/migrations/V17__Add_coupon_system.sql --dry-run 2>&1 || echo "SQL validation failed (see errors above)"

echo ""
echo "=========================================="
echo "Done!"
echo "=========================================="
