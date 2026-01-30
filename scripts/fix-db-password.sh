#!/bin/bash
# Fix PostgreSQL Password Problem
# Dieses Script resettet das DB-Passwort und testet die Verbindung

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

echo "=============================================="
echo "PostgreSQL Password Fix für Store Backend"
echo "=============================================="
echo ""

# Prüfe Passwort
if [ -z "$DB_PASSWORD" ]; then
    print_error "DB_PASSWORD nicht gesetzt!"
    echo ""
    echo "Verwendung:"
    echo "  export DB_PASSWORD='dein_password_hier'"
    echo "  sudo -E $0"
    exit 1
fi

print_info "Konfiguration:"
echo "  Database: $DB_NAME"
echo "  User:     $DB_USER"
echo "  Password: ${DB_PASSWORD:0:3}*** (${#DB_PASSWORD} Zeichen)"
echo ""

# Teste ob PostgreSQL läuft
if ! systemctl is-active --quiet postgresql; then
    print_error "PostgreSQL läuft nicht!"
    echo "Starte: sudo systemctl start postgresql"
    exit 1
fi
print_success "PostgreSQL läuft"

# Prüfe ob User existiert
print_info "Prüfe User $DB_USER..."
if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" | grep -q 1; then
    print_error "User $DB_USER existiert nicht!"
    echo "Erstelle User mit: sudo -E ./scripts/setup-postgres-user.sh"
    exit 1
fi
print_success "User $DB_USER existiert"

# Setze neues Passwort
print_info "Setze neues Passwort für $DB_USER..."
sudo -u postgres psql <<EOF
ALTER USER $DB_USER WITH PASSWORD '$DB_PASSWORD';
EOF
print_success "Passwort gesetzt"

# Prüfe pg_hba.conf
print_info "Prüfe pg_hba.conf..."
PG_VERSION=$(sudo -u postgres psql -tAc "SHOW server_version;" | cut -d. -f1 | tr -d ' ')
PG_HBA="/etc/postgresql/$PG_VERSION/main/pg_hba.conf"

if [ -f "$PG_HBA" ]; then
    print_info "pg_hba.conf gefunden: $PG_HBA"

    # Prüfe ob md5 Auth aktiviert ist
    if grep -q "^host.*all.*all.*127.0.0.1/32.*md5" "$PG_HBA"; then
        print_success "md5 Authentication ist konfiguriert"
    else
        print_warning "md5 Authentication fehlt in pg_hba.conf"
        echo ""
        echo "Aktuelle Konfiguration:"
        grep -v "^#" "$PG_HBA" | grep -v "^$"
        echo ""
        print_info "Füge md5 Authentication hinzu..."
        sudo bash -c "echo 'host    all             all             127.0.0.1/32            md5' >> $PG_HBA"
        print_info "Lade PostgreSQL neu..."
        sudo systemctl reload postgresql
        sleep 2
        print_success "PostgreSQL neu geladen"
    fi
else
    print_warning "pg_hba.conf nicht gefunden an $PG_HBA"
fi

# Teste Verbindung als postgres user
print_info "Teste Verbindung als postgres..."
if sudo -u postgres psql -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1; then
    print_success "Postgres-Verbindung erfolgreich"
else
    print_error "Postgres-Verbindung fehlgeschlagen"
fi

# Teste Verbindung mit Passwort
print_info "Teste Verbindung als $DB_USER mit Passwort..."
if PGPASSWORD="$DB_PASSWORD" psql -h localhost -U "$DB_USER" -d "$DB_NAME" -c "SELECT version();" > /dev/null 2>&1; then
    print_success "Verbindung erfolgreich! ✨"
else
    print_error "Verbindung fehlgeschlagen!"
    echo ""
    echo "Debug-Informationen:"
    echo "1. Versuche manuelle Verbindung:"
    echo "   PGPASSWORD='$DB_PASSWORD' psql -h localhost -U $DB_USER -d $DB_NAME"
    echo ""
    echo "2. Prüfe PostgreSQL Logs:"
    echo "   sudo tail -50 /var/log/postgresql/postgresql-$PG_VERSION-main.log"
    echo ""
    echo "3. Prüfe pg_hba.conf:"
    echo "   sudo cat $PG_HBA | grep -v '^#'"
    exit 1
fi

# Teste JDBC Connection String (wie Spring Boot es macht)
print_info "Teste JDBC-Connection (wie Spring Boot)..."
JDBC_URL="jdbc:postgresql://localhost:5432/$DB_NAME"

# Erstelle temporäres Java Test-Programm
cat > /tmp/TestJdbc.java <<'JAVA_EOF'
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;

public class TestJdbc {
    public static void main(String[] args) {
        String url = args[0];
        String user = args[1];
        String password = args[2];

        try {
            Class.forName("org.postgresql.Driver");
            Connection conn = DriverManager.getConnection(url, user, password);
            Statement stmt = conn.createStatement();
            ResultSet rs = stmt.executeQuery("SELECT 1 as test");
            if (rs.next()) {
                System.out.println("✅ JDBC Connection successful!");
            }
            conn.close();
        } catch (Exception e) {
            System.err.println("❌ JDBC Connection failed: " + e.getMessage());
            System.exit(1);
        }
    }
}
JAVA_EOF

# Kompiliere nur wenn Java verfügbar
if command -v javac > /dev/null 2>&1; then
    cd /tmp
    javac TestJdbc.java 2>/dev/null || true
    if [ -f TestJdbc.class ]; then
        # PostgreSQL JDBC Driver muss verfügbar sein
        PG_JDBC="/opt/storebackend/app.jar"
        if [ -f "$PG_JDBC" ]; then
            if java -cp ".:$PG_JDBC" TestJdbc "$JDBC_URL" "$DB_USER" "$DB_PASSWORD" 2>&1; then
                print_success "JDBC Test erfolgreich"
            else
                print_warning "JDBC Test fehlgeschlagen (siehe Details oben)"
            fi
        else
            print_info "Überspringe JDBC Test (app.jar nicht gefunden)"
        fi
    fi
else
    print_info "Überspringe JDBC Test (Java nicht gefunden)"
fi

# Aktualisiere Environment-Datei
ENV_FILE="/etc/storebackend.env"
if [ -f "$ENV_FILE" ]; then
    print_info "Aktualisiere $ENV_FILE..."

    # Backup erstellen
    sudo cp "$ENV_FILE" "${ENV_FILE}.backup-$(date +%Y%m%d-%H%M%S)"

    # Aktualisiere Passwort
    sudo sed -i "s|^SPRING_DATASOURCE_PASSWORD=.*|SPRING_DATASOURCE_PASSWORD=$DB_PASSWORD|" "$ENV_FILE"

    print_success "Environment-Datei aktualisiert"

    # Zeige relevante Zeilen (ohne Passwort anzuzeigen)
    echo ""
    echo "Aktuelle DB-Konfiguration in $ENV_FILE:"
    sudo grep "SPRING_DATASOURCE" "$ENV_FILE" | sed "s/PASSWORD=.*/PASSWORD=***/g"
else
    print_warning "Environment-Datei $ENV_FILE nicht gefunden"
fi

echo ""
print_success "Password Fix abgeschlossen! 🎉"
echo ""
echo "📋 Nächste Schritte:"
echo "1. Starte die Anwendung neu:"
echo "   sudo systemctl restart storebackend"
echo ""
echo "2. Prüfe die Logs:"
echo "   sudo journalctl -u storebackend -f"
echo ""
echo "3. Teste die API:"
echo "   curl http://localhost:8080/actuator/health"
echo ""

