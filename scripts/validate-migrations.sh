
print_info "Suche nach Migration-Dateien in: $MIGRATION_DIR"

# Liste alle Migrations auf
MIGRATIONS=$(find "$MIGRATION_DIR" -name "V*.sql" | sort)
MIGRATION_COUNT=$(echo "$MIGRATIONS" | grep -c "V" || echo 0)

if [ "$MIGRATION_COUNT" -eq 0 ]; then
    print_warning "Keine Migrationen gefunden"
    exit 0
fi

print_info "Gefundene Migrationen: $MIGRATION_COUNT"
echo "$MIGRATIONS" | while read -r file; do
    basename "$file"
done
echo ""

# Prüfe auf doppelte Versionen
print_info "Prüfe auf doppelte Versionen..."

# Extrahiere Versionsnummern
VERSIONS=$(echo "$MIGRATIONS" | sed -E 's/.*\/V([0-9]+)__.*/\1/' | sort)

# Prüfe auf Duplikate
DUPLICATES=$(echo "$VERSIONS" | uniq -d)

if [ -n "$DUPLICATES" ]; then
    print_error "Doppelte Versionen gefunden!"
    echo ""
    echo "Betroffene Versionen:"
    echo "$DUPLICATES"
    echo ""
    echo "Betroffene Dateien:"
    for version in $DUPLICATES; do
        echo "  Version $version:"
        echo "$MIGRATIONS" | grep "V${version}__" | while read -r file; do
            echo "    - $(basename "$file")"
        done
    done
    echo ""
    print_error "Behebe die Versionskonflikte bevor du deployst!"
    exit 1
fi

print_success "Keine doppelten Versionen gefunden"

# Prüfe auf sequentielle Versionen
print_info "Prüfe Versions-Sequenz..."
EXPECTED=1
HAS_GAPS=false

for version in $VERSIONS; do
    if [ "$version" -ne "$EXPECTED" ]; then
        print_warning "Gap gefunden: V${EXPECTED} fehlt (nächste gefunden: V${version})"
        HAS_GAPS=true
    fi
    EXPECTED=$((version + 1))
done

if [ "$HAS_GAPS" = false ]; then
    print_success "Versionen sind sequentiell (V1 bis V$((EXPECTED - 1)))"
else
    print_warning "Versionen haben Lücken - das ist OK, aber nicht ideal"
fi

# Prüfe SQL-Syntax (basic)
print_info "Prüfe SQL-Syntax (basic)..."
SYNTAX_ERRORS=0

echo "$MIGRATIONS" | while read -r file; do
    # Prüfe ob Datei leer ist
    if [ ! -s "$file" ]; then
        print_warning "Leere Migration: $(basename "$file")"
        continue
    fi

    # Prüfe auf common SQL Fehler
    if grep -q "DROP TABLE.*IF NOT EXISTS" "$file"; then
        print_warning "Verdächtig: DROP TABLE IF NOT EXISTS in $(basename "$file")"
    fi

    # Prüfe ob Schema explizit gesetzt ist
    if ! grep -qi "schema" "$file" && ! grep -qi "public\." "$file"; then
        # OK - Standard ist public schema
        :
    fi
done

print_success "Syntax-Check abgeschlossen"

# Summary
echo ""
print_success "Migration Validation erfolgreich!"
echo "  📊 Migrationen: $MIGRATION_COUNT"
echo "  🔢 Versionen: V1 bis V$((EXPECTED - 1))"
echo "  ✅ Keine Konflikte gefunden"
#!/bin/bash
# Validiert Flyway Migrationen auf doppelte Versionen und Konflikte
# Wird in CI/CD vor dem Deploy ausgeführt

set -e

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
echo "Flyway Migration Validation"
echo "==============================================="

# Finde alle Migration-Dateien
MIGRATION_DIR="src/main/resources/db/migration"

if [ ! -d "$MIGRATION_DIR" ]; then
    print_error "Migration Verzeichnis nicht gefunden: $MIGRATION_DIR"
    exit 1
fi

