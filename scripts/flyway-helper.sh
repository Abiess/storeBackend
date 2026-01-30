#!/bin/bash
# Flyway Migration Helper Script für Production
# Ersetzt die alten init-schema.sh und reset-database.sh Scripts

set -e

DB_NAME="${DB_NAME:-storedb}"
DB_USER="${DB_USER:-storeapp}"
DB_PASSWORD="${DB_PASSWORD}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Farben für Output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Prüfe ob Passwort gesetzt ist
check_password() {
    if [ -z "$DB_PASSWORD" ]; then
        print_error "DB_PASSWORD nicht gesetzt!"
        echo "Bitte setze: export DB_PASSWORD='your_password'"
        exit 1
    fi
}

# Zeige Flyway Status
show_status() {
    print_info "Zeige Flyway Migrations-Status..."

    PGPASSWORD="$DB_PASSWORD" psql -h localhost -U "$DB_USER" -d "$DB_NAME" -c "
        SELECT
            installed_rank,
            version,
            description,
            type,
            script,
            checksum,
            installed_on,
            success
        FROM flyway_schema_history
        ORDER BY installed_rank;
    " 2>/dev/null || {
        print_warning "flyway_schema_history Tabelle existiert noch nicht"
        print_info "Wird beim ersten Application-Start erstellt"
    }
}

# Prüfe letzte Migration
check_last_migration() {
    print_info "Prüfe letzte ausgeführte Migration..."

    LAST_VERSION=$(PGPASSWORD="$DB_PASSWORD" psql -h localhost -U "$DB_USER" -d "$DB_NAME" -t -c "
        SELECT version FROM flyway_schema_history
        WHERE success = true
        ORDER BY installed_rank DESC
        LIMIT 1;
    " 2>/dev/null | xargs)

    if [ -n "$LAST_VERSION" ]; then
        print_success "Letzte Migration: Version $LAST_VERSION"
    else
        print_warning "Noch keine Migrationen ausgeführt"
    fi
}

# Zeige Tabellen-Status
show_tables() {
    print_info "Zeige vorhandene Tabellen..."

    TABLE_COUNT=$(PGPASSWORD="$DB_PASSWORD" psql -h localhost -U "$DB_USER" -d "$DB_NAME" -t -c "
        SELECT COUNT(*) FROM information_schema.tables
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
    " 2>/dev/null | xargs)

    print_success "$TABLE_COUNT Tabellen gefunden"

    PGPASSWORD="$DB_PASSWORD" psql -h localhost -U "$DB_USER" -d "$DB_NAME" -c "
        SELECT
            schemaname,
            tablename,
            pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
        FROM pg_tables
        WHERE schemaname = 'public'
        ORDER BY tablename;
    " 2>/dev/null
}

# Repariere fehlgeschlagene Migration
repair_migration() {
    print_warning "ACHTUNG: Repariere Flyway Migrations-Historie"
    echo "Dies entfernt fehlgeschlagene Migrations-Einträge"
    echo -n "Fortfahren? (yes/no): "
    read -r confirm

    if [ "$confirm" != "yes" ]; then
        print_info "Abgebrochen"
        exit 0
    fi

    check_password

    print_info "Entferne fehlgeschlagene Migrationen..."
    PGPASSWORD="$DB_PASSWORD" psql -h localhost -U "$DB_USER" -d "$DB_NAME" -c "
        DELETE FROM flyway_schema_history WHERE success = false;
    "

    print_success "Repair durchgeführt"
    show_status
}

# Baseline für existierende Datenbank erstellen
create_baseline() {
    print_info "Erstelle Flyway Baseline..."
    print_warning "Nutze dies nur bei existierenden Datenbanken ohne Flyway-Historie"

    check_password

    # Prüfe ob bereits Baseline existiert
    BASELINE_EXISTS=$(PGPASSWORD="$DB_PASSWORD" psql -h localhost -U "$DB_USER" -d "$DB_NAME" -t -c "
        SELECT COUNT(*) FROM information_schema.tables
        WHERE table_name = 'flyway_schema_history';
    " 2>/dev/null | xargs)

    if [ "$BASELINE_EXISTS" = "1" ]; then
        print_warning "Flyway-Historie existiert bereits"
        show_status
        return
    fi

    print_info "Erstelle flyway_schema_history Tabelle..."
    PGPASSWORD="$DB_PASSWORD" psql -h localhost -U "$DB_USER" -d "$DB_NAME" -c "
        CREATE TABLE IF NOT EXISTS flyway_schema_history (
            installed_rank INTEGER NOT NULL,
            version VARCHAR(50),
            description VARCHAR(200) NOT NULL,
            type VARCHAR(20) NOT NULL,
            script VARCHAR(1000) NOT NULL,
            checksum INTEGER,
            installed_by VARCHAR(100) NOT NULL,
            installed_on TIMESTAMP NOT NULL DEFAULT now(),
            execution_time INTEGER NOT NULL,
            success BOOLEAN NOT NULL,
            PRIMARY KEY (installed_rank)
        );

        INSERT INTO flyway_schema_history (
            installed_rank, version, description, type, script,
            installed_by, execution_time, success
        ) VALUES (
            1, '0', '<< Flyway Baseline >>', 'BASELINE', '<< Flyway Baseline >>',
            current_user, 0, true
        );
    "

    print_success "Baseline erstellt"
    show_status
}

# Clean (⚠️ LÖSCHT ALLE DATEN!)
clean_database() {
    print_error "⚠️⚠️⚠️  WARNUNG: DATABASE CLEAN  ⚠️⚠️⚠️"
    echo ""
    echo "Dies wird ALLE Tabellen und ALLE Daten löschen!"
    echo "Nur für Development/Testing verwenden!"
    echo ""
    echo -n "Bist du ABSOLUT SICHER? Tippe 'DELETE ALL DATA' um fortzufahren: "
    read -r confirm

    if [ "$confirm" != "DELETE ALL DATA" ]; then
        print_info "Abgebrochen (weise Entscheidung!)"
        exit 0
    fi

    check_password

    print_info "Erstelle Backup vor dem Löschen..."
    BACKUP_FILE="backup_before_clean_$(date +%Y%m%d_%H%M%S).sql"
    PGPASSWORD="$DB_PASSWORD" pg_dump -h localhost -U "$DB_USER" "$DB_NAME" > "$BACKUP_FILE"
    print_success "Backup erstellt: $BACKUP_FILE"

    print_info "Lösche alle Tabellen..."
    PGPASSWORD="$DB_PASSWORD" psql -h localhost -U "$DB_USER" -d "$DB_NAME" << 'EOF'
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Lösche alle Tabellen
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;

    -- Lösche alle Sequences
    FOR r IN (SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public') LOOP
        EXECUTE 'DROP SEQUENCE IF EXISTS public.' || quote_ident(r.sequence_name) || ' CASCADE';
    END LOOP;
END $$;
EOF

    print_success "Datenbank geleert"
    print_info "Starte Application neu, um Migrationen auszuführen"
}

# Backup erstellen
create_backup() {
    check_password

    BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
    print_info "Erstelle Backup: $BACKUP_FILE"

    PGPASSWORD="$DB_PASSWORD" pg_dump -h localhost -U "$DB_USER" "$DB_NAME" > "$BACKUP_FILE"

    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    print_success "Backup erstellt: $BACKUP_FILE ($BACKUP_SIZE)"
}

# Hilfe anzeigen
show_help() {
    cat << EOF
Flyway Migration Helper für Production

Verwendung: $0 [COMMAND]

Befehle:
  status      Zeige Flyway Migrations-Status
  tables      Zeige alle Tabellen
  check       Prüfe letzte Migration
  repair      Repariere fehlgeschlagene Migrationen
  baseline    Erstelle Baseline für existierende DB
  backup      Erstelle Datenbank-Backup
  clean       ⚠️  LÖSCHT ALLE DATEN (nur Development!)
  help        Zeige diese Hilfe

Umgebungsvariablen:
  DB_NAME      Datenbank-Name (default: storedb)
  DB_USER      Datenbank-User (default: storeapp)
  DB_PASSWORD  Datenbank-Passwort (erforderlich)

Beispiele:
  export DB_PASSWORD='your_password'
  $0 status
  $0 tables
  $0 backup

Hinweise:
  - Flyway-Migrationen werden automatisch beim Application-Start ausgeführt
  - Manuelle Migration nur in Ausnahmefällen nötig
  - Die alten init-schema.sh Scripts werden nicht mehr benötigt

EOF
}

# Main
case "${1:-help}" in
    status)
        check_password
        show_status
        ;;
    tables)
        check_password
        show_tables
        ;;
    check)
        check_password
        check_last_migration
        show_tables
        ;;
    repair)
        repair_migration
        ;;
    baseline)
        create_baseline
        ;;
    backup)
        create_backup
        ;;
    clean)
        clean_database
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        print_error "Unbekannter Befehl: $1"
        echo ""
        show_help
        exit 1
        ;;
esac

