#!/bin/bash
# Setup PostgreSQL User und Datenbank für Store Backend
# Einmalig auf dem VPS ausführen
# PostgreSQL 15+ kompatibel (public schema Rechte fix)

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
echo "PostgreSQL Setup für Store Backend (Flyway)"
echo "==============================================="
echo ""

# Prüfe ob als root/sudo
if [ "$EUID" -ne 0 ]; then
    print_error "Bitte als root ausführen oder sudo verwenden"
    exit 1
fi

# Prüfe Passwort
if [ -z "$DB_PASSWORD" ]; then
    print_error "DB_PASSWORD nicht gesetzt!"
    echo ""
    echo "Verwendung:"
    echo "  export DB_PASSWORD='sichere_passwort_hier'"
    echo "  sudo -E $0"
    echo ""
    echo "Oder direkt:"
    echo "  sudo DB_PASSWORD='sichere_passwort_hier' $0"
    exit 1
fi

print_info "Konfiguration:"
echo "  Datenbank: $DB_NAME"
echo "  User:      $DB_USER"
echo "  Passwort:  ${DB_PASSWORD:0:3}***"
echo ""

# Prüfe ob PostgreSQL läuft
if ! systemctl is-active --quiet postgresql; then
    print_error "PostgreSQL läuft nicht!"
    echo "Starte PostgreSQL: sudo systemctl start postgresql"
    exit 1
fi

print_success "PostgreSQL läuft"

# Erstelle User falls nicht vorhanden
print_info "Prüfe ob User $DB_USER existiert..."
if sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" | grep -q 1; then
    print_warning "User $DB_USER existiert bereits"

    # Aktualisiere Passwort und stelle LOGIN sicher
    print_info "Aktualisiere Passwort und Rechte für $DB_USER..."
    sudo -u postgres psql <<EOF
ALTER USER $DB_USER WITH LOGIN PASSWORD '$DB_PASSWORD';
GRANT CONNECT ON DATABASE $DB_NAME TO $DB_USER;
EOF
    print_success "Passwort und Rechte aktualisiert"
else
    print_info "Erstelle User $DB_USER..."
    sudo -u postgres psql <<EOF
CREATE USER $DB_USER WITH LOGIN PASSWORD '$DB_PASSWORD';
GRANT CONNECT ON DATABASE $DB_NAME TO $DB_USER;
EOF
    print_success "User $DB_USER erstellt"
fi

# Erstelle Datenbank falls nicht vorhanden
print_info "Prüfe ob Datenbank $DB_NAME existiert..."
if sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
    print_warning "Datenbank $DB_NAME existiert bereits"

    # Stelle sicher dass Owner korrekt ist
    print_info "Setze Owner auf $DB_USER..."
    sudo -u postgres psql <<EOF
ALTER DATABASE $DB_NAME OWNER TO $DB_USER;
EOF
else
    print_info "Erstelle Datenbank $DB_NAME..."
    sudo -u postgres psql <<EOF
CREATE DATABASE $DB_NAME OWNER $DB_USER;
EOF
    print_success "Datenbank $DB_NAME erstellt"
fi

# KRITISCH: PostgreSQL 15+ Fix - public Schema Owner setzen
print_info "Setze public Schema Owner (PostgreSQL 15+ Fix)..."
sudo -u postgres psql -d "$DB_NAME" <<EOF
-- PostgreSQL 15+ hat public Schema standardmäßig ohne PUBLIC Rechte
-- Setze $DB_USER als Owner des public Schemas
ALTER SCHEMA public OWNER TO $DB_USER;

-- Gebe explizit alle Rechte
GRANT ALL ON SCHEMA public TO $DB_USER;
GRANT CREATE ON SCHEMA public TO $DB_USER;
GRANT USAGE ON SCHEMA public TO $DB_USER;

-- Stelle sicher dass $DB_USER auch nach DB-Neustart Rechte hat
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
EOF
print_success "public Schema Owner: $DB_USER (PostgreSQL 15+ kompatibel)"

# Setze Berechtigungen auf existierende und zukünftige Objekte
print_info "Setze Default Privileges für zukünftige Objekte..."
sudo -u postgres psql -d "$DB_NAME" <<EOF
-- Default Privileges für Objekte die $DB_USER erstellt
ALTER DEFAULT PRIVILEGES FOR USER $DB_USER IN SCHEMA public
    GRANT ALL ON TABLES TO $DB_USER;
ALTER DEFAULT PRIVILEGES FOR USER $DB_USER IN SCHEMA public
    GRANT ALL ON SEQUENCES TO $DB_USER;
ALTER DEFAULT PRIVILEGES FOR USER $DB_USER IN SCHEMA public
    GRANT ALL ON FUNCTIONS TO $DB_USER;

-- Default Privileges für Objekte die postgres User erstellt (falls jemals)
ALTER DEFAULT PRIVILEGES FOR USER postgres IN SCHEMA public
    GRANT ALL ON TABLES TO $DB_USER;
ALTER DEFAULT PRIVILEGES FOR USER postgres IN SCHEMA public
    GRANT ALL ON SEQUENCES TO $DB_USER;
ALTER DEFAULT PRIVILEGES FOR USER postgres IN SCHEMA public
    GRANT ALL ON FUNCTIONS TO $DB_USER;
EOF
print_success "Default Privileges gesetzt"

# Falls bereits Tabellen existieren, übertrage Ownership
print_info "Prüfe existierende Objekte..."
sudo -u postgres psql -d "$DB_NAME" <<EOF
DO \$\$
DECLARE
    r RECORD;
    table_count INT := 0;
    seq_count INT := 0;
BEGIN
    -- Ownership für alle existierenden Tabellen
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname='public') LOOP
        EXECUTE format('ALTER TABLE public.%I OWNER TO $DB_USER', r.tablename);
        EXECUTE format('GRANT ALL PRIVILEGES ON TABLE public.%I TO $DB_USER', r.tablename);
        RAISE NOTICE 'Changed owner of table % to $DB_USER', r.tablename;
        table_count := table_count + 1;
    END LOOP;

    -- Ownership für alle Sequences
    FOR r IN (SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema='public') LOOP
        EXECUTE format('ALTER SEQUENCE public.%I OWNER TO $DB_USER', r.sequence_name);
        EXECUTE format('GRANT ALL PRIVILEGES ON SEQUENCE public.%I TO $DB_USER', r.sequence_name);
        RAISE NOTICE 'Changed owner of sequence % to $DB_USER', r.sequence_name;
        seq_count := seq_count + 1;
    END LOOP;

    -- Grant ALL auf existierende Objekte (zusätzliche Sicherheit)
    EXECUTE 'GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $DB_USER';
    EXECUTE 'GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO $DB_USER';

    RAISE NOTICE 'Migrated % tables and % sequences to $DB_USER', table_count, seq_count;
END
\$\$;
EOF
print_success "Existierende Objekte migriert"

# Teste Verbindung
print_info "Teste Verbindung als $DB_USER..."
if PGPASSWORD="$DB_PASSWORD" psql -h localhost -U "$DB_USER" -d "$DB_NAME" -c "SELECT version();" > /dev/null 2>&1; then
    print_success "Verbindung erfolgreich!"
else
    print_error "Verbindung fehlgeschlagen!"
    echo ""
    echo "Prüfe pg_hba.conf Konfiguration:"
    echo "  sudo nano /etc/postgresql/*/main/pg_hba.conf"
    echo ""
    echo "Stelle sicher, dass folgende Zeile vorhanden ist:"
    echo "  host    all             all             127.0.0.1/32            md5"
    echo ""
    echo "Dann PostgreSQL neu laden:"
    echo "  sudo systemctl reload postgresql"
    exit 1
fi

# Zeige Datenbank-Info
print_info "Datenbank-Informationen:"
sudo -u postgres psql -d "$DB_NAME" <<EOF
-- Basis-Info
SELECT
    'Database: ' || current_database() as info
UNION ALL
SELECT 'Database Owner: ' || pg_catalog.pg_get_userbyid(d.datdba)
FROM pg_catalog.pg_database d
WHERE d.datname = current_database()
UNION ALL
SELECT 'Database Size: ' || pg_size_pretty(pg_database_size(current_database()));

-- Schema Info
SELECT
    '─────────────────────────────────────' as separator
UNION ALL
SELECT 'Schema: public';

SELECT
    'Schema Owner: ' || nspowner::regrole::text as info
FROM pg_namespace
WHERE nspname = 'public';

-- Existierende Tabellen (falls vorhanden)
SELECT '─────────────────────────────────────' as separator;
SELECT 'Tables in public schema:' as info;

SELECT
    '  → ' || tablename || ' (Owner: ' || tableowner || ')' as info
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
EOF

echo ""
print_success "PostgreSQL Setup abgeschlossen!"
echo ""
print_info "📋 Wichtige Hinweise:"
echo ""
echo "1️⃣  User-Info:"
echo "   - User: $DB_USER"
echo "   - Database: $DB_NAME"
echo "   - Database Owner: $DB_USER ✅"
echo "   - public Schema Owner: $DB_USER ✅ (PostgreSQL 15+ Fix angewendet)"
echo "   - LOGIN: ✅ Aktiviert"
echo ""
echo "2️⃣  Nächste Schritte:"
echo "   - Setze Passwort in Environment: export DB_PASSWORD='***'"
echo "   - Starte App neu: sudo systemctl restart storebackend"
echo "   - Beobachte Logs: sudo journalctl -u storebackend -f"
echo ""
print_warning "⚠️  PostgreSQL 15+ Hinweis:"
echo "   Ab PostgreSQL 15 hat das public Schema standardmäßig keine PUBLIC Rechte mehr."
echo "   Dieses Script setzt explizit $DB_USER als Schema Owner."
echo ""
