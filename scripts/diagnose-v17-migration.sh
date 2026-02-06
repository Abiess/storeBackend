#!/bin/bash
# Diagnose V17 migration issue on the server

echo "=========================================="
echo "V17 Migration Diagnostics"
echo "=========================================="
echo ""

echo "1. Checking if V17 migration file exists on server..."
if [ -f "/opt/storebackend/migrations/V17__Add_coupon_system.sql" ]; then
    echo "✓ V17 migration file found"
    echo ""
    echo "File size:"
    ls -lh /opt/storebackend/migrations/V17__Add_coupon_system.sql
    echo ""
    echo "File checksum:"
    md5sum /opt/storebackend/migrations/V17__Add_coupon_system.sql
else
    echo "✗ V17 migration file NOT found at /opt/storebackend/migrations/"
    echo ""
    echo "Available migration files:"
    ls -lh /opt/storebackend/migrations/ 2>&1 | tail -10
fi

echo ""
echo "=========================================="
echo "2. Checking Flyway Schema History for V17"
echo "=========================================="
sudo -u postgres psql -d storedb -c "SELECT installed_rank, version, description, type, script, checksum, installed_by, installed_on, execution_time, success FROM flyway_schema_history WHERE version = '17' OR script LIKE '%V17%';"

echo ""
echo "=========================================="
echo "3. Checking for existing coupon tables"
echo "=========================================="
sudo -u postgres psql -d storedb -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND (table_name LIKE '%coupon%' OR table_name LIKE '%promo%') ORDER BY table_name;"

echo ""
echo "=========================================="
echo "4. Testing V17 SQL in transaction (will rollback)"
echo "=========================================="
echo "Attempting dry-run of V17 migration..."
sudo -u postgres psql -d storedb << 'EOF'
BEGIN;
-- Try to execute V17
\i /opt/storebackend/migrations/V17__Add_coupon_system.sql
ROLLBACK;
EOF

echo ""
echo "=========================================="
echo "5. Checking application.yml Flyway settings"
echo "=========================================="
if [ -f "/opt/storebackend/application.yml" ]; then
    echo "Flyway configuration:"
    grep -A 10 "flyway:" /opt/storebackend/application.yml
else
    echo "application.yml not found at /opt/storebackend/"
fi

echo ""
echo "=========================================="
echo "6. Last Flyway-related errors from logs"
echo "=========================================="
sudo journalctl -u storebackend -n 1000 --no-pager | grep -i "flyway\|migration" | tail -30

echo ""
echo "=========================================="
echo "Done! Analysis complete."
echo "=========================================="

