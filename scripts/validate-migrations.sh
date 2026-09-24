#!/usr/bin/env bash
set -euo pipefail

# ✅ Hilfsfunktionen
print_info() {
    echo "ℹ️  $1"
}

print_warning() {
    echo "⚠️  WARNING: $1"
}

print_error() {
    echo "❌ ERROR: $1"
}

print_success() {
    echo "✅ $1"
}

echo "==============================================="
echo "Flyway Migration Validation"
echo "==============================================="
echo ""

# Migration-Verzeichnis
MIGRATION_DIR="src/main/resources/db/migration"

if [ ! -d "$MIGRATION_DIR" ]; then
    print_error "Migration directory not found: $MIGRATION_DIR"
    exit 1
fi

print_info "Suche nach Migration-Dateien in: $MIGRATION_DIR"

# Liste alle Migrations auf
MIGRATIONS=$(find "$MIGRATION_DIR" -name "V*.sql" 2>/dev/null | sort || true)
MIGRATION_COUNT=$(echo "$MIGRATIONS" | grep -c "V" || echo 0)

if [ "$MIGRATION_COUNT" -eq 0 ]; then
    print_warning "Keine Migrationen gefunden in $MIGRATION_DIR"
    print_info "Prüfe ob Dateien existieren:"
    ls -la "$MIGRATION_DIR" || true
    exit 0
fi

print_success "Gefundene Migrationen: $MIGRATION_COUNT"
echo "$MIGRATIONS" | while read -r file; do
    if [ -n "$file" ]; then
        echo "  - $(basename "$file")"
    fi
done
echo ""

# Prüfe auf doppelte Versionen
print_info "Prüfe auf doppelte Versionen..."

# Extrahiere Versionsnummern
VERSIONS=$(echo "$MIGRATIONS" | sed -E 's/.*\/V([0-9]+)__.*/\1/' | sort -n)

# Prüfe auf Duplikate
DUPLICATES=$(echo "$VERSIONS" | uniq -d)

if [ -n "$DUPLICATES" ]; then
    print_error "Doppelte Versionen gefunden!"
    echo ""
    echo "Betroffene Versionen:"
    echo "$DUPLICATES"
    echo ""
    print_error "Behebe die Versionskonflikte bevor du deployst!"
    exit 1
fi

print_success "Keine doppelten Versionen gefunden"

# Prüfe auf sequentielle Versionen
print_info "Prüfe Versions-Sequenz..."
FIRST_VERSION=$(echo "$VERSIONS" | head -n 1)
LAST_VERSION=$(echo "$VERSIONS" | tail -n 1)
HAS_GAPS=false

EXPECTED=$FIRST_VERSION
for version in $VERSIONS; do
    if [ "$version" -ne "$EXPECTED" ]; then
        print_warning "Gap gefunden: V${EXPECTED} fehlt (nächste: V${version})"
        HAS_GAPS=true
        EXPECTED=$version
    fi
    EXPECTED=$((version + 1))
done

if [ "$HAS_GAPS" = false ]; then
    print_success "Versionen sind sequentiell (V${FIRST_VERSION} bis V${LAST_VERSION})"
else
    print_warning "Versionen haben Lücken - das ist OK mit out-of-order=true"
fi

# Summary
echo ""
print_success "Migration Validation erfolgreich!"
echo "  📊 Migrationen: $MIGRATION_COUNT"
echo "  🔢 Versionen: V${FIRST_VERSION} bis V${LAST_VERSION}"
echo "  ✅ Keine Konflikte gefunden"
echo ""
