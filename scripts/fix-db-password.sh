#!/bin/bash
# Fix PostgreSQL Password und Rechte für storeapp User
# Idempotent - kann mehrfach ausgeführt werden

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

echo "==============================================="
echo "PostgreSQL Password & Permissions Fix"
echo "==============================================="

if [ -z "$DB_PASSWORD" ]; then
    print_error "DB_PASSWORD nicht gesetzt!"
    exit 1
fi

print_info "Aktualisiere Passwort für $DB_USER..."
sudo -u postgres psql <<EOF
ALTER USER $DB_USER WITH LOGIN PASSWORD '$DB_PASSWORD';
EOF
print_success "Passwort aktualisiert"

# KRITISCH: Alle Rechte auf public Schema setzen
print_info "Setze volle Rechte auf Schema public..."

# Split in mehrere Transaktionen um Locks zu vermeiden
print_info "  → Schema Owner und Basis-Rechte..."
sudo -u postgres psql -d "$DB_NAME" <<'EOF'
-- Schema Owner setzen (PostgreSQL 15+ Fix)
ALTER SCHEMA public OWNER TO storeapp;

-- Explizite Rechte auf Schema
GRANT ALL ON SCHEMA public TO storeapp;
GRANT CREATE ON SCHEMA public TO storeapp;
GRANT USAGE ON SCHEMA public TO storeapp;

-- Rechte auf Datenbank
GRANT ALL PRIVILEGES ON DATABASE storedb TO storeapp;
EOF

print_info "  → Rechte auf existierende Objekte..."
sudo -u postgres psql -d "$DB_NAME" <<'EOF'
-- Rechte auf alle existierenden Objekte
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO storeapp;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO storeapp;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO storeapp;
EOF

print_info "  → Default Privileges für storeapp..."
sudo -u postgres psql -d "$DB_NAME" <<'EOF'
-- Default Privileges für zukünftige Objekte (durch storeapp erstellt)
ALTER DEFAULT PRIVILEGES FOR USER storeapp IN SCHEMA public
    GRANT ALL ON TABLES TO storeapp;
ALTER DEFAULT PRIVILEGES FOR USER storeapp IN SCHEMA public
    GRANT ALL ON SEQUENCES TO storeapp;
ALTER DEFAULT PRIVILEGES FOR USER storeapp IN SCHEMA public
    GRANT ALL ON FUNCTIONS TO storeapp;
EOF

print_info "  → Default Privileges für postgres..."
# Dieser Teil kann fehlschlagen wenn postgres User nicht Owner ist - nicht kritisch
sudo -u postgres psql -d "$DB_NAME" <<'EOF' 2>/dev/null || print_warning "Default privileges für postgres User übersprungen (nicht kritisch)"
-- Default Privileges für zukünftige Objekte (durch postgres erstellt)
ALTER DEFAULT PRIVILEGES FOR USER postgres IN SCHEMA public
    GRANT ALL ON TABLES TO storeapp;
ALTER DEFAULT PRIVILEGES FOR USER postgres IN SCHEMA public
    GRANT ALL ON SEQUENCES TO storeapp;
ALTER DEFAULT PRIVILEGES FOR USER postgres IN SCHEMA public
    GRANT ALL ON FUNCTIONS TO storeapp;
EOF

print_success "Alle Rechte gesetzt (PostgreSQL 15+ kompatibel)"

# Teste Verbindung
print_info "Teste Verbindung und CREATE Rechte..."
if timeout 10 bash -c "PGPASSWORD='$DB_PASSWORD' psql -h localhost -U '$DB_USER' -d '$DB_NAME' -c \"
    CREATE TABLE IF NOT EXISTS _permission_test (id INT);
    DROP TABLE IF EXISTS _permission_test;
    SELECT 'CREATE permission OK' as test;
\" > /dev/null 2>&1"; then
    print_success "Verbindung und CREATE-Rechte erfolgreich getestet!"
else
    print_error "Verbindung oder CREATE-Rechte fehlgeschlagen!"
    print_warning "Prüfe: sudo journalctl -u postgresql -n 50"
    exit 1
fi

print_success "PostgreSQL Passwort und Rechte erfolgreich aktualisiert"
