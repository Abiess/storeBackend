#!/bin/bash
# Vollständiges Permissions-Setup für storeapp (AUSSERHALB Flyway)
# Wird VOR Flyway-Migrationen ausgeführt um Locks zu vermeiden

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
echo "Complete Permissions Setup (outside Flyway)"
echo "================================================"

if [ -z "$DB_PASSWORD" ]; then
    print_error "DB_PASSWORD nicht gesetzt!"
    exit 1
fi

# KRITISCH: App muss gestoppt sein!
print_info "Stelle sicher dass App gestoppt ist..."
if systemctl is-active --quiet storebackend 2>/dev/null; then
    print_warning "App läuft noch - wird NICHT gestoppt (manuell stoppen falls nötig)"
    # NICHT automatisch stoppen - das macht fix-db-password.sh
fi

print_info "Setze VOLLSTÄNDIGE Permissions für $DB_USER..."

# Timeout setzen um Hängen zu vermeiden
export PGCONNECT_TIMEOUT=5
export PGSTATEMENT_TIMEOUT=30000  # 30s

# 1. Basis-Rechte (schnell)
print_info "  → Basis-Rechte auf Schema..."
sudo -u postgres psql -d "$DB_NAME" -v ON_ERROR_STOP=1 <<'EOF'
SET lock_timeout = '5s';
SET statement_timeout = '30s';

-- Schema-Rechte (KEIN Owner-Wechsel!)
GRANT USAGE ON SCHEMA public TO storeapp;
GRANT CREATE ON SCHEMA public TO storeapp;
GRANT ALL ON SCHEMA public TO storeapp;

-- Datenbank-Rechte
GRANT ALL PRIVILEGES ON DATABASE storedb TO storeapp;
EOF

# 2. Existierende Objekte (kann etwas dauern)
print_info "  → Rechte auf existierende Objekte..."
sudo -u postgres psql -d "$DB_NAME" -v ON_ERROR_STOP=1 <<'EOF'
SET lock_timeout = '5s';
SET statement_timeout = '30s';

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO storeapp;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO storeapp;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO storeapp;
EOF

# 3. Default Privileges für storeapp (meistens schnell)
print_info "  → Default Privileges für storeapp..."
sudo -u postgres psql -d "$DB_NAME" -v ON_ERROR_STOP=1 <<'EOF'
SET lock_timeout = '5s';
SET statement_timeout = '30s';

ALTER DEFAULT PRIVILEGES FOR USER storeapp IN SCHEMA public
    GRANT ALL ON TABLES TO storeapp;
ALTER DEFAULT PRIVILEGES FOR USER storeapp IN SCHEMA public
    GRANT ALL ON SEQUENCES TO storeapp;
ALTER DEFAULT PRIVILEGES FOR USER storeapp IN SCHEMA public
    GRANT ALL ON FUNCTIONS TO storeapp;
EOF

# 4. Default Privileges für postgres (optional, kann übersprungen werden)
print_info "  → Default Privileges für postgres (optional)..."
if sudo -u postgres psql -d "$DB_NAME" -v ON_ERROR_STOP=1 <<'EOF' 2>/dev/null; then
SET lock_timeout = '3s';
SET statement_timeout = '10s';

ALTER DEFAULT PRIVILEGES FOR USER postgres IN SCHEMA public
    GRANT ALL ON TABLES TO storeapp;
ALTER DEFAULT PRIVILEGES FOR USER postgres IN SCHEMA public
    GRANT ALL ON SEQUENCES TO storeapp;
ALTER DEFAULT PRIVILEGES FOR USER postgres IN SCHEMA public
    GRANT ALL ON FUNCTIONS TO storeapp;
EOF
    print_success "Default Privileges für postgres gesetzt"
else
    print_warning "Default Privileges für postgres übersprungen (nicht kritisch)"
fi

print_success "Alle Permissions erfolgreich gesetzt!"
print_info "Flyway kann jetzt sicher laufen (V3 wird schnell durchlaufen)"

