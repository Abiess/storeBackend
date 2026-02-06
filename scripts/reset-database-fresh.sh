#!/bin/bash
# Complete Database Reset Script - Fresh Start mit Squash-Migration
# Löscht die gesamte storedb Datenbank und erstellt sie neu
# Flyway startet dann mit V1__initial_schema.sql von vorne

set -e

DB_NAME="${DB_NAME:-storedb}"
DB_USER="${DB_USER:-storeapp}"
DB_PASSWORD="${DB_PASSWORD}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
SERVICE_NAME="storebackend"

# Farben für Output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

echo "========================================================"
echo "🔥 COMPLETE DATABASE RESET - FRESH START"
echo "========================================================"
print_warning "Dies löscht die GESAMTE Datenbank '$DB_NAME' inkl. aller Daten!"
print_warning "Flyway-History wird komplett zurückgesetzt"
echo ""
echo "Aktion: Datenbank '$DB_NAME' komplett löschen und neu erstellen"
echo ""
echo -n "Bist du SICHER? Tippe 'DELETE-ALL' um fortzufahren: "
read -r confirm

if [ "$confirm" != "DELETE-ALL" ]; then
    print_info "Abgebrochen - keine Änderungen vorgenommen"
    exit 0
fi

print_info "Starte kompletten Reset..."

# 0. Stoppe die Application ZUERST (damit keine neuen DB-Verbindungen entstehen)
print_info "Stoppe Application '$SERVICE_NAME'..."
if systemctl list-unit-files | grep -q "^${SERVICE_NAME}.service"; then
    if systemctl is-active --quiet "$SERVICE_NAME"; then
        sudo systemctl stop "$SERVICE_NAME"
        print_success "Application '$SERVICE_NAME' gestoppt"
        # Warte kurz, damit alle Verbindungen geschlossen werden
        sleep 2
    else
        print_info "Application '$SERVICE_NAME' läuft nicht"
    fi
else
    print_info "Service '$SERVICE_NAME' nicht gefunden (evtl. lokale Entwicklung)"
fi

# 1. Bestehende Verbindungen zur Datenbank beenden
print_info "Beende alle verbleibenden Verbindungen zu '$DB_NAME'..."
sudo -u postgres psql -c "
SELECT pg_terminate_backend(pg_stat_activity.pid)
FROM pg_stat_activity
WHERE pg_stat_activity.datname = '$DB_NAME'
  AND pid <> pg_backend_pid();
" 2>/dev/null || print_warning "Keine aktiven Verbindungen gefunden"

# 2. Datenbank löschen
print_info "Lösche Datenbank '$DB_NAME'..."
sudo -u postgres psql -c "DROP DATABASE IF EXISTS $DB_NAME;" 2>/dev/null || {
    print_error "Fehler beim Löschen der Datenbank"
    print_error "Evtl. gibt es noch aktive Verbindungen. Prüfe mit:"
    print_error "sudo -u postgres psql -c \"SELECT * FROM pg_stat_activity WHERE datname = '$DB_NAME';\""
    exit 1
}
print_success "Datenbank '$DB_NAME' gelöscht"

# 3. Datenbank neu erstellen
print_info "Erstelle Datenbank '$DB_NAME' neu..."
sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" 2>/dev/null || {
    print_error "Fehler beim Erstellen der Datenbank"
    exit 1
}
print_success "Datenbank '$DB_NAME' neu erstellt"

# 4. Berechtigungen setzen
print_info "Setze Berechtigungen für '$DB_USER'..."
sudo -u postgres psql -d $DB_NAME -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"
sudo -u postgres psql -d $DB_NAME -c "GRANT ALL PRIVILEGES ON SCHEMA public TO $DB_USER;"
sudo -u postgres psql -d $DB_NAME -c "ALTER SCHEMA public OWNER TO $DB_USER;"
print_success "Berechtigungen gesetzt"

# 5. Prüfe ob Datenbank leer ist
TABLE_COUNT=$(sudo -u postgres psql -d $DB_NAME -t -c "
    SELECT COUNT(*) FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
" | xargs)

print_success "Datenbank ist leer ($TABLE_COUNT Tabellen)"

echo ""
print_success "✅ Database Reset abgeschlossen!"
echo ""
print_info "Nächste Schritte:"
echo "  1. Starte die Spring Boot Application (wird automatisch im deploy.sh gemacht)"
echo "  2. Flyway wird automatisch V1__initial_schema.sql ausführen"
echo "  3. Alle Tabellen werden neu erstellt mit korrektem Schema"
echo ""
print_warning "Hinweis: Die Application wurde gestoppt und muss neu gestartet werden!"
echo ""
