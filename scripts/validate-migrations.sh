#!/bin/bash
# Validate Flyway Migrations - Check for duplicate versions and conflicts
# To be used in CI/CD pipeline

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

MIGRATION_DIR="src/main/resources/db/migration"

echo "=========================================="
echo "🔍 Flyway Migration Validation"
echo "=========================================="
echo ""

# Prüfe ob Migrations-Ordner existiert
if [ ! -d "$MIGRATION_DIR" ]; then
    print_error "Migrations-Ordner nicht gefunden: $MIGRATION_DIR"
    exit 1
fi

print_info "Scanning migrations in: $MIGRATION_DIR"
echo ""

# Finde alle SQL-Migrations-Dateien
MIGRATIONS=$(find "$MIGRATION_DIR" -name "V*.sql" | sort)

if [ -z "$MIGRATIONS" ]; then
    print_warning "Keine Migrations gefunden in $MIGRATION_DIR"
    exit 0
fi

# Array für Versionen
declare -A versions
HAS_DUPLICATES=0
HAS_ISSUES=0

print_info "Found migrations:"
for migration in $MIGRATIONS; do
    filename=$(basename "$migration")
    echo "   - $filename"

    # Extrahiere Version (z.B. V1, V001, V2_1)
    # Flyway ignoriert führende Nullen, also V1 = V001 = V01
    if [[ $filename =~ ^V([0-9]+) ]]; then
        version_raw="${BASH_REMATCH[1]}"
        # Entferne führende Nullen für Vergleich
        version=$((10#$version_raw))

        # Prüfe auf Duplikat
        if [ -n "${versions[$version]}" ]; then
            print_error "DUPLICATE VERSION FOUND!"
            echo "   Version $version appears in:"
            echo "     1. ${versions[$version]}"
            echo "     2. $filename"
            echo ""
            HAS_DUPLICATES=1
        else
            versions[$version]=$filename
        fi
    else
        print_warning "Invalid migration filename: $filename (should start with V<number>__)"
        HAS_ISSUES=1
    fi
done

echo ""

# Prüfe ob alle Migrationen das richtige Format haben
print_info "Validating migration naming convention..."
for migration in $MIGRATIONS; do
    filename=$(basename "$migration")

    # Format: V<number>__<description>.sql
    if ! [[ $filename =~ ^V[0-9]+__.+\.sql$ ]]; then
        print_error "Invalid naming: $filename"
        echo "   Expected format: V<number>__<description>.sql"
        echo "   Example: V1__initial_schema.sql"
        HAS_ISSUES=1
    fi
done

echo ""

# Zeige Migrations-Reihenfolge
print_info "Migration order (by version number):"
for version in $(echo "${!versions[@]}" | tr ' ' '\n' | sort -n); do
    printf "   V%-3s -> %s\n" "$version" "${versions[$version]}"
done

echo ""
echo "=========================================="

if [ $HAS_DUPLICATES -eq 1 ]; then
    print_error "VALIDATION FAILED: Duplicate versions detected!"
    echo ""
    echo "🔧 How to fix:"
    echo "   1. Rename migrations to use unique version numbers (V1, V2, V3, ...)"
    echo "   2. Don't use leading zeros (V001 = V1 in Flyway)"
    echo "   3. Follow naming convention: V<number>__<description>.sql"
    echo ""
    exit 1
fi

if [ $HAS_ISSUES -eq 1 ]; then
    print_error "VALIDATION FAILED: Migration naming issues detected!"
    exit 1
fi

print_success "All migrations are valid! ✨"
echo ""
print_info "Summary:"
echo "   Total migrations: ${#versions[@]}"
echo "   Version range: V$(echo "${!versions[@]}" | tr ' ' '\n' | sort -n | head -1) - V$(echo "${!versions[@]}" | tr ' ' '\n' | sort -n | tail -1)"
echo ""

exit 0

