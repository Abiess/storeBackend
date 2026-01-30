#!/bin/bash
# Generiert eine neue Flyway-Migration mit korrekter Versionsnummer
# Verwendung: ./scripts/generate-migration.sh "beschreibung"

set -e

DESCRIPTION="$1"

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

print_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }

if [ -z "$DESCRIPTION" ]; then
    print_error "Beschreibung fehlt!"
    echo ""
    echo "Verwendung:"
    echo "  ./scripts/generate-migration.sh \"add user preferences\""
    echo "  ./scripts/generate-migration.sh \"fix missing indexes\""
    echo ""
    exit 1
fi

MIGRATION_DIR="src/main/resources/db/migration"

if [ ! -d "$MIGRATION_DIR" ]; then
    print_error "Migration-Ordner nicht gefunden: $MIGRATION_DIR"
    exit 1
fi

cd "$MIGRATION_DIR"

# Finde nächste freie Version
LAST_VERSION=$(ls -1 V*.sql 2>/dev/null | sed 's/.*V\([0-9]*\)__.*/\1/' | sort -n | tail -1)

if [ -z "$LAST_VERSION" ]; then
    NEXT_VERSION=1
else
    NEXT_VERSION=$((LAST_VERSION + 1))
fi

# Sanitize Description (ersetze Leerzeichen mit Underscores)
CLEAN_DESC=$(echo "$DESCRIPTION" | tr ' ' '_' | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9_]//g')

FILENAME="V${NEXT_VERSION}__${CLEAN_DESC}.sql"

print_info "Erstelle neue Migration:"
echo "  Version:      V${NEXT_VERSION}"
echo "  Beschreibung: $DESCRIPTION"
echo "  Datei:        $FILENAME"
echo ""

# Erstelle Migration-Datei mit Template
cat > "$FILENAME" <<EOF
-- Flyway Migration V${NEXT_VERSION}: $DESCRIPTION
-- Created: $(date +%Y-%m-%d)
-- Author: $(git config user.name 2>/dev/null || echo "Unknown")
-- Description: TODO - Beschreibe hier was diese Migration macht

-- Explizit public Schema setzen
SET search_path TO public;

-- ==========================================
-- TODO: Deine SQL-Statements hier einfügen
-- ==========================================

-- Beispiel: Neue Tabelle
/*
CREATE TABLE IF NOT EXISTS example_table (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_example_table_ref FOREIGN KEY (ref_id) REFERENCES other_table(id)
);
*/

-- Beispiel: Idempotenter Index
/*
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_example_name') THEN
        CREATE INDEX idx_example_name ON example_table(name);
    END IF;
END \$\$;
*/

-- Beispiel: Spalte hinzufügen (idempotent)
/*
DO \$\$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'new_column'
    ) THEN
        ALTER TABLE users ADD COLUMN new_column VARCHAR(100);
    END IF;
END \$\$;
*/

-- Beispiel: Daten einfügen (idempotent)
/*
INSERT INTO settings (key, value)
VALUES ('feature_flag', 'enabled')
ON CONFLICT (key) DO NOTHING;
*/
EOF

print_success "Migration erstellt: $FILENAME"
echo ""
print_info "Nächste Schritte:"
echo "  1. Bearbeite die Datei und füge deine SQL-Statements ein"
echo "  2. Teste lokal: ./mvnw spring-boot:run"
echo "  3. Validiere: ./mvnw flyway:validate"
echo "  4. Commit: git add $MIGRATION_DIR/$FILENAME"
echo ""
print_info "Öffne Datei mit:"
echo "  code $MIGRATION_DIR/$FILENAME"
echo ""

