#!/bin/bash
# Emergency Diagnostic - Flyway sagt V5 applied aber Spalte fehlt
# Verwendung: sudo ./scripts/emergency-schema-check.sh

set -e

DB_NAME="${DB_NAME:-storedb}"
DB_USER="${DB_USER:-storeapp}"
DB_PASSWORD="${DB_PASSWORD}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }

echo "================================================"
echo "EMERGENCY DIAGNOSTIC: Flyway vs Hibernate"
echo "================================================"
echo ""

if [ -z "$DB_PASSWORD" ]; then
    print_error "DB_PASSWORD nicht gesetzt!"
    echo "Verwendung: DB_PASSWORD='xxx' sudo -E ./scripts/emergency-schema-check.sh"
    exit 1
fi

# 1. Prüfe Flyway Status
print_info "1. FLYWAY STATUS (flyway_schema_history):"
PGPASSWORD="$DB_PASSWORD" psql -h localhost -U "$DB_USER" -d "$DB_NAME" <<'EOF'
SELECT
    installed_rank,
    version,
    description,
    script,
    installed_on,
    execution_time,
    success
FROM flyway_schema_history
ORDER BY installed_rank;
EOF

echo ""

# 2. Prüfe cart_items Spalten
print_info "2. CART_ITEMS SPALTEN (information_schema):"
PGPASSWORD="$DB_PASSWORD" psql -h localhost -U "$DB_USER" -d "$DB_NAME" <<'EOF'
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'cart_items'
ORDER BY ordinal_position;
EOF

echo ""

# 3. Detaillierte Tabellen-Info
print_info "3. CART_ITEMS STRUKTUR (\d+ cart_items):"
PGPASSWORD="$DB_PASSWORD" psql -h localhost -U "$DB_USER" -d "$DB_NAME" -c "\d+ cart_items"

echo ""

# 4. Prüfe search_path
print_info "4. AKTUELLER SEARCH_PATH:"
PGPASSWORD="$DB_PASSWORD" psql -h localhost -U "$DB_USER" -d "$DB_NAME" <<'EOF'
SHOW search_path;
SELECT current_schema();
EOF

echo ""

# 5. Prüfe ob created_at wirklich fehlt
print_info "5. SPALTEN-CHECK (created_at vorhanden?):"
CREATED_EXISTS=$(PGPASSWORD="$DB_PASSWORD" psql -h localhost -U "$DB_USER" -d "$DB_NAME" -t -c "
SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'cart_items'
      AND column_name = 'created_at'
);
" | xargs)

UPDATED_EXISTS=$(PGPASSWORD="$DB_PASSWORD" psql -h localhost -U "$DB_USER" -d "$DB_NAME" -t -c "
SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'cart_items'
      AND column_name = 'updated_at'
);
" | xargs)

if [ "$CREATED_EXISTS" = "t" ]; then
    print_success "created_at existiert in cart_items"
else
    print_error "created_at FEHLT in cart_items!"
fi

if [ "$UPDATED_EXISTS" = "t" ]; then
    print_success "updated_at existiert in cart_items"
else
    print_error "updated_at FEHLT in cart_items!"
fi

echo ""

# 6. Prüfe V5 Migration Details
print_info "6. V5 MIGRATION DETAILS:"
V5_SUCCESS=$(PGPASSWORD="$DB_PASSWORD" psql -h localhost -U "$DB_USER" -d "$DB_NAME" -t -c "
SELECT success FROM flyway_schema_history WHERE version = '5';
" | xargs)

if [ "$V5_SUCCESS" = "t" ]; then
    print_success "V5 wurde als ERFOLGREICH markiert"

    # Zeige Execution Time
    PGPASSWORD="$DB_PASSWORD" psql -h localhost -U "$DB_USER" -d "$DB_NAME" <<'EOF'
SELECT
    version,
    description,
    installed_on,
    execution_time,
    success
FROM flyway_schema_history
WHERE version = '5';
EOF
else
    print_warning "V5 wurde NICHT erfolgreich ausgeführt oder existiert nicht"
fi

echo ""

# 7. DIAGNOSE
echo "================================================"
print_warning "DIAGNOSE:"
echo "================================================"
echo ""

if [ "$CREATED_EXISTS" = "f" ] && [ "$V5_SUCCESS" = "t" ]; then
    print_error "PROBLEM GEFUNDEN: V5 als erfolgreich markiert ABER Spalte fehlt!"
    echo ""
    echo "Mögliche Ursachen:"
    echo "  1. V5 lief gegen FALSCHES SCHEMA (nicht public)"
    echo "  2. V5 lief gegen FALSCHE DATENBANK"
    echo "  3. V5 hatte Fehler aber wurde trotzdem als success markiert"
    echo "  4. V5 Migration-SQL war fehlerhaft (DO-Block ohne EXCEPTION)"
    echo "  5. Transaktion wurde committed aber Spalte nicht wirklich erstellt"
    echo ""
    print_warning "EMPFOHLENE AKTION:"
    echo "  1. Lösche V5 Entry aus flyway_schema_history"
    echo "  2. Füge Spalten manuell hinzu"
    echo "  3. Re-run V5 Migration"
    echo ""
    print_info "BEFEHLE:"
    echo "  # Lösche V5 Entry:"
    echo "  DELETE FROM flyway_schema_history WHERE version = '5';"
    echo ""
    echo "  # Füge Spalten hinzu:"
    echo "  ALTER TABLE cart_items ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;"
    echo "  ALTER TABLE cart_items ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;"
    echo ""
    echo "  # Restart App (Flyway wird V5 erneut ausführen)"
    echo "  sudo systemctl restart storebackend"
    echo ""
elif [ "$CREATED_EXISTS" = "t" ]; then
    print_success "KEIN PROBLEM: Spalten existieren!"
    echo ""
    echo "Hibernate sollte keine Schema-Validation-Fehler mehr werfen."
    echo "Falls doch: Cache-Problem oder App läuft gegen andere DB."
    echo ""
else
    print_warning "V5 wurde noch nicht ausgeführt"
    echo ""
    echo "Das ist OK - V5 wird beim nächsten App-Start ausgeführt."
    echo ""
fi

echo "================================================"
print_info "MANUELLE FIX-OPTION (falls V5 fehlschlug):"
echo "================================================"
echo ""
echo "# 1. Verbinde als postgres:"
echo "sudo -u postgres psql -d $DB_NAME"
echo ""
echo "# 2. Füge Spalten hinzu:"
echo "ALTER TABLE cart_items ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;"
echo "ALTER TABLE cart_items ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;"
echo ""
echo "# 3. Lösche V5 aus History (falls vorhanden):"
echo "DELETE FROM flyway_schema_history WHERE version = '5';"
echo ""
echo "# 4. Restart App:"
echo "sudo systemctl restart storebackend"
echo ""

