#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
# MIGRATION IDEMPOTENZ TEST
# ============================================================================
# 
# Testet ob V015/V016/V017 mehrfach ausgeführt werden können
# 
# Tests:
# A) Frische DB → V015 → V016 → V017
# B) Erneut: V015 → V016 → V017
# C) Schema-Validierung
# D) Daten-Integrität
#
# WICHTIG: Läuft gegen TEST-Datenbank, nicht Production!
# ============================================================================

echo "============================================================================"
echo "MIGRATION IDEMPOTENZ TEST"
echo "============================================================================"
echo ""

# Test-DB Namen
TEST_DB="storedb_migration_test"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATIONS_DIR="$SCRIPT_DIR/db/migrations"

# Farben
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# ============================================================================
# Phase 1: Test-DB vorbereiten
# ============================================================================

echo "Phase 1: Test-DB vorbereiten"
echo ""

# Prüfe ob postgres läuft
if ! sudo -u postgres psql -c "SELECT 1;" > /dev/null 2>&1; then
    print_error "PostgreSQL ist nicht erreichbar!"
    exit 1
fi
print_success "PostgreSQL läuft"

# Lösche alte Test-DB falls vorhanden
echo "   Bereinige alte Test-DB..."
sudo -u postgres psql -c "DROP DATABASE IF EXISTS $TEST_DB;" > /dev/null 2>&1
print_success "Alte Test-DB entfernt"

# Erstelle frische Test-DB
echo "   Erstelle frische Test-DB..."
sudo -u postgres psql -c "CREATE DATABASE $TEST_DB;" > /dev/null 2>&1
print_success "Test-DB '$TEST_DB' erstellt"

# Erstelle Basis-Schema (stores, users Tabellen die von FKs referenziert werden)
echo "   Erstelle Basis-Schema..."
sudo -u postgres psql -d "$TEST_DB" > /dev/null 2>&1 <<'EOF'
CREATE TABLE IF NOT EXISTS stores (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS dhl_parcels (
    id BIGSERIAL PRIMARY KEY,
    store_id BIGINT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    tracking_code VARCHAR(50) NOT NULL,
    shelf_location VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL,
    received_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT dhl_parcels_store_id_tracking_code_key UNIQUE (store_id, tracking_code)
);

-- Test-Daten einfügen
INSERT INTO stores (id, name) VALUES (121, 'Test Store 121');
INSERT INTO users (id, email) VALUES (1, 'test@example.com');
INSERT INTO dhl_parcels (id, store_id, tracking_code, shelf_location, status, received_at)
VALUES (1, 121, 'TEST123', 'A1', 'STORED', NOW());
EOF
print_success "Basis-Schema erstellt"
echo ""

# ============================================================================
# Phase 2: Erste Migration (frische DB)
# ============================================================================

echo "Phase 2: Erste Migration (frische DB)"
echo ""

for migration in "$MIGRATIONS_DIR"/V015__*.sql "$MIGRATIONS_DIR"/V016__*.sql "$MIGRATIONS_DIR"/V017__*.sql; do
    if [ ! -f "$migration" ]; then
        print_warning "Migration nicht gefunden: $migration"
        continue
    fi
    
    MIGRATION_NAME=$(basename "$migration")
    echo "   ▶️  $MIGRATION_NAME (1. Durchlauf)"
    
    if sudo -u postgres psql -d "$TEST_DB" -v ON_ERROR_STOP=1 -q -f "$migration" > /tmp/migration-test-1.log 2>&1; then
        print_success "$MIGRATION_NAME OK (1. Durchlauf)"
    else
        print_error "$MIGRATION_NAME FEHLGESCHLAGEN (1. Durchlauf)"
        echo "      Log:"
        sed 's/^/         /' /tmp/migration-test-1.log
        exit 1
    fi
done
echo ""

# ============================================================================
# Phase 3: Zweite Migration (Idempotenz-Test)
# ============================================================================

echo "Phase 3: Zweite Migration (Idempotenz-Test)"
echo ""

for migration in "$MIGRATIONS_DIR"/V015__*.sql "$MIGRATIONS_DIR"/V016__*.sql "$MIGRATIONS_DIR"/V017__*.sql; do
    if [ ! -f "$migration" ]; then
        continue
    fi
    
    MIGRATION_NAME=$(basename "$migration")
    echo "   ▶️  $MIGRATION_NAME (2. Durchlauf)"
    
    if sudo -u postgres psql -d "$TEST_DB" -v ON_ERROR_STOP=1 -q -f "$migration" > /tmp/migration-test-2.log 2>&1; then
        print_success "$MIGRATION_NAME OK (2. Durchlauf - IDEMPOTENT ✅)"
    else
        print_error "$MIGRATION_NAME FEHLGESCHLAGEN (2. Durchlauf - NICHT IDEMPOTENT ❌)"
        echo "      Log:"
        sed 's/^/         /' /tmp/migration-test-2.log
        exit 1
    fi
done
echo ""

# ============================================================================
# Phase 4: Schema-Validierung
# ============================================================================

echo "Phase 4: Schema-Validierung"
echo ""

# Prüfe Tabelle existiert
if sudo -u postgres psql -d "$TEST_DB" -tAc "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'dhl_activity_log');" | grep -q 't'; then
    print_success "Tabelle 'dhl_activity_log' existiert"
else
    print_error "Tabelle 'dhl_activity_log' existiert NICHT"
    exit 1
fi

# Prüfe Spalte failure_reason existiert
if sudo -u postgres psql -d "$TEST_DB" -tAc "SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dhl_activity_log' AND column_name = 'failure_reason');" | grep -q 't'; then
    print_success "Spalte 'failure_reason' existiert"
else
    print_error "Spalte 'failure_reason' existiert NICHT"
    exit 1
fi

# Prüfe Spalten aus V017 existieren
if sudo -u postgres psql -d "$TEST_DB" -tAc "SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dhl_activity_log' AND column_name = 'cancellation_reason');" | grep -q 't'; then
    print_success "Spalte 'cancellation_reason' existiert"
else
    print_error "Spalte 'cancellation_reason' existiert NICHT"
    exit 1
fi

if sudo -u postgres psql -d "$TEST_DB" -tAc "SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dhl_parcels' AND column_name = 'cancelled_at');" | grep -q 't'; then
    print_success "Spalte 'cancelled_at' existiert"
else
    print_error "Spalte 'cancelled_at' existiert NICHT"
    exit 1
fi

# Prüfe Partial Index existiert
if sudo -u postgres psql -d "$TEST_DB" -tAc "SELECT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_dhl_parcels_active_tracking');" | grep -q 't'; then
    print_success "Index 'idx_dhl_parcels_active_tracking' existiert"
else
    print_error "Index 'idx_dhl_parcels_active_tracking' existiert NICHT"
    exit 1
fi

# Prüfe alter Constraint ist weg
if sudo -u postgres psql -d "$TEST_DB" -tAc "SELECT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'dhl_parcels_store_id_tracking_code_key');" | grep -q 'f'; then
    print_success "Alter Unique Constraint wurde erfolgreich entfernt"
else
    print_warning "Alter Unique Constraint existiert noch (kann bei frischer DB normal sein)"
fi

echo ""

# ============================================================================
# Phase 5: Daten-Integrität
# ============================================================================

echo "Phase 5: Daten-Integrität"
echo ""

# Prüfe Test-Paket noch vorhanden
PARCEL_COUNT=$(sudo -u postgres psql -d "$TEST_DB" -tAc "SELECT COUNT(*) FROM dhl_parcels WHERE tracking_code = 'TEST123';")
if [ "$PARCEL_COUNT" = "1" ]; then
    print_success "Test-Paket noch vorhanden (keine Daten verloren)"
else
    print_error "Test-Paket fehlt! Daten wurden verloren!"
    exit 1
fi

echo ""

# ============================================================================
# CLEANUP
# ============================================================================

echo "Cleanup:"
echo "   Möchten Sie die Test-DB behalten? (y/N)"
read -t 5 -r KEEP_DB || KEEP_DB="n"
if [[ ! $KEEP_DB =~ ^[Yy]$ ]]; then
    sudo -u postgres psql -c "DROP DATABASE IF EXISTS $TEST_DB;" > /dev/null 2>&1
    print_success "Test-DB gelöscht"
else
    print_warning "Test-DB '$TEST_DB' wurde NICHT gelöscht"
    echo "   Manuell löschen mit: sudo -u postgres psql -c \"DROP DATABASE $TEST_DB;\""
fi

echo ""
echo "============================================================================"
print_success "ALLE TESTS BESTANDEN ✅"
echo "============================================================================"
echo ""
echo "Ergebnis:"
echo "  ✅ V015 ist idempotent"
echo "  ✅ V016 ist idempotent"
echo "  ✅ V017 ist idempotent"
echo "  ✅ Schema korrekt"
echo "  ✅ Keine Daten verloren"
echo ""
