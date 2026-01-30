#!/bin/bash
# Fix PostgreSQL Password und Rechte für storeapp User
# Idempotent - kann mehrfach ausgeführt werden
# LOCK-SAFE: Stoppt App, terminiert Sessions, nutzt Timeouts

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

# KRITISCH: App stoppen um Locks zu vermeiden
print_info "Stoppe storebackend App um DB-Locks zu vermeiden..."
if systemctl is-active --quiet storebackend 2>/dev/null; then
    sudo systemctl stop storebackend || true
    sleep 2
    print_success "App gestoppt"
else
    print_info "App läuft nicht (OK)"
fi

print_info "Aktualisiere Passwort für $DB_USER..."
sudo -u postgres psql -v ON_ERROR_STOP=1 <<EOF
ALTER USER $DB_USER WITH LOGIN PASSWORD '$DB_PASSWORD';
EOF
print_success "Passwort aktualisiert"

# Terminate aktive Sessions auf storedb
print_info "Beende aktive Sessions auf $DB_NAME..."
sudo -u postgres psql -v ON_ERROR_STOP=1 <<EOF
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname='$DB_NAME' AND pid <> pg_backend_pid();
EOF
print_success "Aktive Sessions beendet"

# KRITISCH: Rechte setzen MIT Timeouts (kein Owner-Wechsel nötig!)
print_info "Setze Rechte auf Schema public (ohne Owner-Wechsel)..."

sudo -u postgres psql -d "$DB_NAME" -v ON_ERROR_STOP=1 <<'EOF'
-- Timeouts setzen um Lock-Hängen zu verhindern
SET lock_timeout = '5s';
SET statement_timeout = '30s';

-- Schema-Rechte (KEIN Owner-Wechsel - vermeidet Locks!)
GRANT USAGE ON SCHEMA public TO storeapp;
GRANT CREATE ON SCHEMA public TO storeapp;
GRANT ALL ON SCHEMA public TO storeapp;

-- Datenbank-Rechte
GRANT ALL PRIVILEGES ON DATABASE storedb TO storeapp;

-- Rechte auf alle existierenden Objekte
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO storeapp;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO storeapp;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO storeapp;
EOF

print_success "Schema-Rechte gesetzt (ohne Owner-Wechsel)"

# Default Privileges für zukünftige Objekte
print_info "Setze Default Privileges..."

sudo -u postgres psql -d "$DB_NAME" -v ON_ERROR_STOP=1 <<'EOF'
SET lock_timeout = '5s';
SET statement_timeout = '30s';

-- Default Privileges für Objekte die storeapp erstellt
ALTER DEFAULT PRIVILEGES FOR USER storeapp IN SCHEMA public
    GRANT ALL ON TABLES TO storeapp;
ALTER DEFAULT PRIVILEGES FOR USER storeapp IN SCHEMA public
    GRANT ALL ON SEQUENCES TO storeapp;
ALTER DEFAULT PRIVILEGES FOR USER storeapp IN SCHEMA public
    GRANT ALL ON FUNCTIONS TO storeapp;
EOF

print_success "Default Privileges für storeapp gesetzt"

# Default Privileges für postgres User (optional, kann fehlschlagen)
print_info "Setze Default Privileges für postgres User (optional)..."
if sudo -u postgres psql -d "$DB_NAME" -v ON_ERROR_STOP=1 <<'EOF' 2>/dev/null; then
SET lock_timeout = '5s';
SET statement_timeout = '30s';

-- Default Privileges für Objekte die postgres erstellt
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

# Teste Verbindung und CREATE Rechte
print_info "Teste Verbindung und CREATE Rechte..."
if timeout 10 bash -c "PGPASSWORD='$DB_PASSWORD' psql -h localhost -U '$DB_USER' -d '$DB_NAME' -v ON_ERROR_STOP=1 -c \"
    SET statement_timeout = '5s';
    CREATE TABLE IF NOT EXISTS _permission_test_$(date +%s) (id INT);
    DROP TABLE IF EXISTS _permission_test_$(date +%s);
    SELECT 'CREATE permission OK' as test;
\" > /dev/null 2>&1"; then
    print_success "Verbindung und CREATE-Rechte erfolgreich getestet!"
else
    print_error "Verbindung oder CREATE-Rechte fehlgeschlagen!"
    print_warning "Prüfe: sudo journalctl -u postgresql -n 50"
    exit 1
fi

print_success "PostgreSQL Passwort und Rechte erfolgreich aktualisiert"
print_info "App kann nun gestartet werden (deploy.sh macht das automatisch)"
