
echo ""
print_success "Flyway Repair abgeschlossen!"
print_info "Prüfe Status mit: sudo journalctl -u storebackend -f"
#!/bin/bash
# Flyway Repair Script für Checksum-Mismatch
# Verwendung: sudo ./scripts/flyway-repair.sh

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
echo "Flyway Repair - Checksum Mismatch Fix"
echo "================================================"
echo ""

if [ -z "$DB_PASSWORD" ]; then
    print_error "DB_PASSWORD nicht gesetzt!"
    echo "Verwendung: DB_PASSWORD='xxx' sudo -E ./scripts/flyway-repair.sh"
    exit 1
fi

# Zeige aktuellen Flyway Status
print_info "Aktueller Flyway Status:"
PGPASSWORD="$DB_PASSWORD" psql -h localhost -U "$DB_USER" -d "$DB_NAME" <<'EOF'
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

echo ""
print_warning "⚠️  ACHTUNG: Folgende Optionen verfügbar:"
echo ""
echo "1) Flyway Repair (Spring Boot) - Recommended"
echo "   → Stoppt App, führt Repair aus, startet App neu"
echo ""
echo "2) Manuelle Checksum-Korrektur (SQL)"
echo "   → Direkter DB-Update (nur wenn Option 1 nicht funktioniert)"
echo ""
echo "3) Failed Migrations löschen"
echo "   → Entfernt fehlgeschlagene Migration-Einträge"
echo ""
echo "4) Abbrechen"
echo ""

read -p "Wähle Option (1-4): " option

case $option in
    1)
        print_info "Option 1: Flyway Repair via Spring Boot"
        echo ""

        # App stoppen
        print_info "Stoppe storebackend..."
        sudo systemctl stop storebackend || true
        sleep 2

        # Repair ausführen
        print_info "Führe Flyway Repair aus..."
        cd /opt/storebackend

        if [ ! -f app.jar ]; then
            print_error "app.jar nicht gefunden in /opt/storebackend"
            exit 1
        fi

        # Temporär Repair aktivieren
        export FLYWAY_REPAIR_ON_MIGRATE=true
        export SPRING_DATASOURCE_PASSWORD="$DB_PASSWORD"
        export SPRING_PROFILES_ACTIVE=production

        # Flyway Info anzeigen (vor Repair)
        print_info "Flyway Info (vor Repair):"
        java -jar app.jar --spring.flyway.enabled=true \
                          --spring.flyway.repair-on-migrate=false \
                          org.springframework.boot.loader.JarLauncher \
                          flyway:info 2>&1 | tail -20 || true

        # Repair durchführen
        print_info "Führe Repair durch..."
        timeout 60 java -jar app.jar --spring.flyway.repair-on-migrate=true \
                                      --spring.main.web-application-type=none \
                                      --spring.flyway.enabled=true || print_warning "Repair Timeout (kann OK sein)"

        print_success "Flyway Repair abgeschlossen"

        # App neu starten
        print_info "Starte storebackend neu..."
        sudo systemctl start storebackend

        # Warte auf App-Start
        sleep 5

        if systemctl is-active --quiet storebackend; then
            print_success "App läuft wieder!"
            echo ""
            print_info "Prüfe Logs:"
            sudo journalctl -u storebackend -n 30 --no-pager | grep -i flyway || true
        else
            print_error "App konnte nicht gestartet werden!"
            print_warning "Prüfe Logs: sudo journalctl -u storebackend -n 100"
            exit 1
        fi
        ;;

    2)
        print_info "Option 2: Manuelle Checksum-Korrektur"
        echo ""
        print_warning "⚠️  Dies ändert die Checksums direkt in der DB!"
        echo ""

        # Zeige verfügbare Versionen
        print_info "Verfügbare Versionen:"
        PGPASSWORD="$DB_PASSWORD" psql -h localhost -U "$DB_USER" -d "$DB_NAME" -c "
        SELECT version, description, checksum, success
        FROM flyway_schema_history
        ORDER BY installed_rank;
        "

        echo ""
        read -p "Welche Version korrigieren? (z.B. 1): " version
        read -p "Neuer Checksum (oder 'null' für NULL): " checksum

        if [ "$checksum" = "null" ]; then
            checksum="NULL"
        fi

        print_info "Aktualisiere Version $version mit Checksum $checksum..."
        PGPASSWORD="$DB_PASSWORD" psql -h localhost -U "$DB_USER" -d "$DB_NAME" <<EOF
UPDATE flyway_schema_history
SET checksum = $checksum
WHERE version = '$version';
EOF

        print_success "Checksum aktualisiert"
        print_warning "Starte App neu: sudo systemctl restart storebackend"
        ;;

    3)
        print_info "Option 3: Failed Migrations löschen"
        echo ""

        # Zeige fehlgeschlagene Migrations
        FAILED=$(PGPASSWORD="$DB_PASSWORD" psql -h localhost -U "$DB_USER" -d "$DB_NAME" -t -c "
        SELECT COUNT(*) FROM flyway_schema_history WHERE success = false;
        " | xargs)

        if [ "$FAILED" = "0" ]; then
            print_success "Keine fehlgeschlagenen Migrations gefunden"
            exit 0
        fi

        print_warning "Gefunden: $FAILED fehlgeschlagene Migration(s)"
        PGPASSWORD="$DB_PASSWORD" psql -h localhost -U "$DB_USER" -d "$DB_NAME" -c "
        SELECT version, description, installed_on
        FROM flyway_schema_history
        WHERE success = false;
        "

        echo ""
        read -p "Wirklich löschen? (yes/no): " confirm

        if [ "$confirm" = "yes" ]; then
            PGPASSWORD="$DB_PASSWORD" psql -h localhost -U "$DB_USER" -d "$DB_NAME" <<'EOF'
DELETE FROM flyway_schema_history WHERE success = false;
EOF
            print_success "Fehlgeschlagene Migrations gelöscht"
            print_warning "Starte App neu: sudo systemctl restart storebackend"
        else
            print_info "Abgebrochen"
        fi
        ;;

    4)
        print_info "Abgebrochen"
        exit 0
        ;;

    *)
        print_error "Ungültige Option"
        exit 1
        ;;
esac

