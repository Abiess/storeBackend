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

echo "=========================================================="
echo "🔧 Force Run Migrations V5 and V6"
echo "=========================================================="
echo ""

# Verwende DB_PASSWORD aus Environment
DB_PASSWORD="${DB_PASSWORD:-}"
if [ -z "$DB_PASSWORD" ]; then
    print_error "DB_PASSWORD nicht gesetzt!"
    exit 1
fi

print_info "Prüfe Flyway-History..."

# Prüfe welche Migrationen bereits ausgeführt wurden
FLYWAY_STATUS=$(PGPASSWORD="$DB_PASSWORD" psql -h localhost -U storeapp -d storedb -t -c "SELECT version, description, installed_on FROM flyway_schema_history ORDER BY installed_rank;" 2>/dev/null || echo "")

if [ -z "$FLYWAY_STATUS" ]; then
    print_warning "Konnte Flyway-History nicht lesen"
else
    echo "Bereits ausgeführte Migrationen:"
    echo "$FLYWAY_STATUS"
    echo ""
fi

# Prüfe ob V5 bereits existiert
V5_EXISTS=$(PGPASSWORD="$DB_PASSWORD" psql -h localhost -U storeapp -d storedb -t -c "SELECT COUNT(*) FROM flyway_schema_history WHERE version = '5';" 2>/dev/null || echo "0")

if [ "$V5_EXISTS" -gt 0 ]; then
    print_info "V5 ist bereits in flyway_schema_history - überspringe"
else
    print_info "Führe V5 Migration manuell aus..."

    # V5: Add created_at/updated_at to cart_items
    PGPASSWORD="$DB_PASSWORD" psql -h localhost -U storeapp -d storedb <<'EOF'
-- V5: Add created_at and updated_at to cart_items
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'cart_items'
          AND column_name = 'created_at'
    ) THEN
        ALTER TABLE cart_items
        ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;
        RAISE NOTICE 'Added created_at column to cart_items';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'cart_items'
          AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE cart_items
        ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;
        RAISE NOTICE 'Added updated_at column to cart_items';
    END IF;
END $$;

-- Füge V5 zur Flyway-History hinzu
INSERT INTO flyway_schema_history (installed_rank, version, description, type, script, checksum, installed_by, installed_on, execution_time, success)
SELECT
    COALESCE(MAX(installed_rank), 0) + 1,
    '5',
    'add created at to cart items',
    'SQL',
    'V5__add_created_at_to_cart_items.sql',
    0,
    'storeapp',
    NOW(),
    100,
    true
FROM flyway_schema_history
WHERE NOT EXISTS (SELECT 1 FROM flyway_schema_history WHERE version = '5');
EOF

    print_success "V5 Migration ausgeführt"
fi

# Prüfe ob V6 bereits existiert
V6_EXISTS=$(PGPASSWORD="$DB_PASSWORD" psql -h localhost -U storeapp -d storedb -t -c "SELECT COUNT(*) FROM flyway_schema_history WHERE version = '6';" 2>/dev/null || echo "0")

if [ "$V6_EXISTS" -gt 0 ]; then
    print_info "V6 ist bereits in flyway_schema_history - überspringe"
else
    print_info "Führe V6 Migration manuell aus..."

    # V6: Add content_type to media
    PGPASSWORD="$DB_PASSWORD" psql -h localhost -U storeapp -d storedb <<'EOF'
-- V6: Add content_type to media
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'media'
          AND column_name = 'content_type'
    ) THEN
        ALTER TABLE media
        ADD COLUMN content_type VARCHAR(100) NOT NULL DEFAULT 'application/octet-stream';

        -- Remove default after adding
        ALTER TABLE media ALTER COLUMN content_type DROP DEFAULT;

        RAISE NOTICE 'Added content_type column to media';
    END IF;
END $$;

-- Füge V6 zur Flyway-History hinzu
INSERT INTO flyway_schema_history (installed_rank, version, description, type, script, checksum, installed_by, installed_on, execution_time, success)
SELECT
    COALESCE(MAX(installed_rank), 0) + 1,
    '6',
    'add content type to media',
    'SQL',
    'V6__add_content_type_to_media.sql',
    0,
    'storeapp',
    NOW(),
    100,
    true
FROM flyway_schema_history
WHERE NOT EXISTS (SELECT 1 FROM flyway_schema_history WHERE version = '6');
EOF

    print_success "V6 Migration ausgeführt"
fi

echo ""
print_success "Migration-Check abgeschlossen"

# Zeige finale History
print_info "Finale Flyway-History:"
PGPASSWORD="$DB_PASSWORD" psql -h localhost -U storeapp -d storedb -c "SELECT version, description, installed_on, success FROM flyway_schema_history ORDER BY installed_rank;"

echo ""
print_success "✅ Alle Migrationen sind nun angewendet!"

