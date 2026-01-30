#!/bin/bash
# Diagnose PostgreSQL Datenbank-Rechte und Flyway-Status
# Für Troubleshooting bei Permission-Problemen

set -e

DB_NAME="${DB_NAME:-storedb}"
DB_USER="${DB_USER:-storeapp}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }

echo "==============================================="
echo "PostgreSQL Datenbank Diagnose"
echo "==============================================="

# Prüfe ob PostgreSQL läuft
if ! systemctl is-active --quiet postgresql; then
    print_error "PostgreSQL läuft nicht!"
    exit 1
fi
print_success "PostgreSQL läuft"

# Prüfe ob User existiert
print_info "Prüfe User: $DB_USER"
if sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" | grep -q 1; then
    print_success "User $DB_USER existiert"
else
    print_error "User $DB_USER existiert NICHT!"
    exit 1
fi

# Prüfe ob Datenbank existiert
print_info "Prüfe Datenbank: $DB_NAME"
if sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
    print_success "Datenbank $DB_NAME existiert"
else
    print_error "Datenbank $DB_NAME existiert NICHT!"
    exit 1
fi

# Zeige Schema-Ownership
echo ""
print_info "Schema public Ownership:"
sudo -u postgres psql -d "$DB_NAME" <<EOF
SELECT
    nspname AS schema_name,
    pg_catalog.pg_get_userbyid(nspowner) AS owner
FROM pg_namespace
WHERE nspname = 'public';
EOF

# Zeige Rechte auf Schema
echo ""
print_info "Rechte von $DB_USER auf Schema public:"
sudo -u postgres psql -d "$DB_NAME" <<EOF
SELECT
    grantee,
    privilege_type
FROM information_schema.role_usage_grants
WHERE object_schema = 'public'
  AND grantee = '$DB_USER';
EOF

# Zeige Tabellen und deren Owner
echo ""
print_info "Tabellen in public Schema:"
sudo -u postgres psql -d "$DB_NAME" <<EOF
SELECT
    tablename,
    tableowner
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
EOF

# Zeige Sequences und deren Owner
echo ""
print_info "Sequences in public Schema:"
sudo -u postgres psql -d "$DB_NAME" <<EOF
SELECT
    sequence_name,
    sequence_schema
FROM information_schema.sequences
WHERE sequence_schema = 'public';
EOF

# Prüfe Flyway Schema History
echo ""
print_info "Flyway Migration Status:"
if sudo -u postgres psql -d "$DB_NAME" -tAc "SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='flyway_schema_history');" | grep -q t; then
    print_success "flyway_schema_history existiert"
    echo ""
    sudo -u postgres psql -d "$DB_NAME" <<EOF
SELECT
    installed_rank,
    version,
    description,
    type,
    script,
    checksum,
    installed_on,
    execution_time,
    success
FROM flyway_schema_history
ORDER BY installed_rank;
EOF
else
    print_warning "flyway_schema_history existiert noch nicht (erste Migration steht an)"
fi

# Teste CREATE Permission
echo ""
print_info "Teste CREATE-Rechte für $DB_USER..."
TEST_RESULT=$(sudo -u postgres psql -d "$DB_NAME" <<EOF
-- Test als storeapp User
SET ROLE $DB_USER;
CREATE TABLE _permission_test_$(date +%s) (id INT);
DROP TABLE _permission_test_$(date +%s);
SELECT 'CREATE permission OK' as result;
EOF
)

if echo "$TEST_RESULT" | grep -q "CREATE permission OK"; then
    print_success "CREATE-Rechte funktionieren!"
else
    print_error "CREATE-Rechte fehlen!"
    echo "Führe aus: sudo /opt/storebackend/scripts/fix-db-password.sh"
fi

echo ""
print_success "Diagnose abgeschlossen"

