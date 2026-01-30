#!/bin/bash
# PostgreSQL Lock Debugging - Findet hängende Statements
# Verwendung: sudo ./scripts/debug-locks.sh

set -e

DB_NAME="${DB_NAME:-storedb}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }

echo "================================================"
echo "PostgreSQL Lock Debugging"
echo "================================================"
echo ""

# 1. Zeige alle aktiven Queries
print_info "1. Aktive Queries in $DB_NAME:"
sudo -u postgres psql -d "$DB_NAME" <<'EOF'
SELECT
    pid,
    usename,
    application_name,
    state,
    query_start,
    state_change,
    wait_event_type,
    wait_event,
    LEFT(query, 100) as query
FROM pg_stat_activity
WHERE datname = 'storedb'
  AND pid <> pg_backend_pid()
ORDER BY query_start;
EOF

echo ""

# 2. Zeige blockierte Queries
print_info "2. Blockierte Queries (Locks):"
sudo -u postgres psql -d "$DB_NAME" <<'EOF'
SELECT
    blocked_locks.pid AS blocked_pid,
    blocked_activity.usename AS blocked_user,
    blocking_locks.pid AS blocking_pid,
    blocking_activity.usename AS blocking_user,
    blocked_activity.query AS blocked_statement,
    blocking_activity.query AS blocking_statement,
    blocked_activity.application_name AS blocked_app
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks
    ON blocking_locks.locktype = blocked_locks.locktype
    AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
    AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
    AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
    AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
    AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
    AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
    AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
    AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
    AND blocking_locks.pid != blocked_locks.pid
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;
EOF

echo ""

# 3. Zeige alle Locks
print_info "3. Alle aktuellen Locks:"
sudo -u postgres psql -d "$DB_NAME" <<'EOF'
SELECT
    locktype,
    relation::regclass,
    mode,
    transactionid,
    pid,
    granted
FROM pg_locks
WHERE database = (SELECT oid FROM pg_database WHERE datname = 'storedb')
ORDER BY pid, locktype;
EOF

echo ""

# 4. Zeige lang laufende Queries
print_info "4. Lang laufende Queries (> 10 Sekunden):"
sudo -u postgres psql -d "$DB_NAME" <<'EOF'
SELECT
    pid,
    now() - query_start AS duration,
    usename,
    application_name,
    state,
    LEFT(query, 150) as query
FROM pg_stat_activity
WHERE datname = 'storedb'
  AND state != 'idle'
  AND now() - query_start > interval '10 seconds'
  AND pid <> pg_backend_pid()
ORDER BY duration DESC;
EOF

echo ""

# 5. Zeige Flyway-spezifische Queries
print_info "5. Flyway Migrations (falls läuft):"
sudo -u postgres psql -d "$DB_NAME" <<'EOF'
SELECT
    pid,
    application_name,
    state,
    now() - query_start AS runtime,
    wait_event_type,
    wait_event,
    LEFT(query, 200) as query
FROM pg_stat_activity
WHERE datname = 'storedb'
  AND (application_name LIKE '%Flyway%' OR query LIKE '%flyway%')
ORDER BY query_start;
EOF

echo ""
echo "================================================"
print_warning "WENN FLYWAY HÄNGT:"
echo ""
echo "1. Finde blockierende PIDs:"
echo "   SELECT pid FROM pg_stat_activity WHERE state = 'active' AND datname = 'storedb';"
echo ""
echo "2. Terminiere blockierende Query:"
echo "   SELECT pg_terminate_backend(<PID>);"
echo ""
echo "3. Stoppe App um Locks zu vermeiden:"
echo "   sudo systemctl stop storebackend"
echo ""
echo "4. Führe Repair aus:"
echo "   sudo /opt/storebackend/scripts/flyway-repair.sh"
echo ""

