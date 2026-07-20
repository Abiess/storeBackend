#!/bin/bash
# V003 Migration Deployment Script
# Korrigiert den CHECK constraint für connection_status

set -e  # Exit bei Fehler

# Datenbank-Namen (anpassen falls nötig)
DB_NAME="storebackend"  # ODER "storedb" - bitte vor Ausführung prüfen!

echo "=== V003 Migration: Extend connection_status constraint ==="
echo ""
echo "Datenbank: $DB_NAME"
echo ""

# Prüfen, welche Datenbank existiert
echo "1. Verfügbare Datenbanken prüfen:"
sudo -u postgres psql -c "\l" | grep -E "store"

echo ""
read -p "Bestätigen Sie den Datenbank-Namen '$DB_NAME' (j/n)? " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Jj]$ ]]
then
    echo "Abgebrochen. Bitte DB_NAME im Script anpassen."
    exit 1
fi

echo ""
echo "2. Aktuelle Constraints prüfen:"
sudo -u postgres psql -d "$DB_NAME" -c "
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'store_payment_configurations'::regclass
  AND conname LIKE '%connection_status%';
"

echo ""
echo "3. Migration ausführen..."
sudo -u postgres psql -d "$DB_NAME" << 'EOF'
-- V003: Extend store_payment_configurations connection_status constraint

-- Beide möglichen Constraint-Namen defensiv droppen
ALTER TABLE store_payment_configurations 
    DROP CONSTRAINT IF EXISTS store_payment_configurations_connection_status_check;

ALTER TABLE store_payment_configurations 
    DROP CONSTRAINT IF EXISTS chk_store_payment_connection_status;

-- Neuen Constraint mit Production-Namen erstellen
ALTER TABLE store_payment_configurations
    ADD CONSTRAINT store_payment_configurations_connection_status_check
    CHECK (connection_status IN ('NOT_CONNECTED', 'PLATFORM_SANDBOX', 'CONNECTED', 'ERROR'));

SELECT 'Migration V003 erfolgreich' AS status;
EOF

echo ""
echo "4. Verifizierung - Constraint prüfen:"
sudo -u postgres psql -d "$DB_NAME" -c "
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'store_payment_configurations'::regclass
  AND conname LIKE '%connection_status%';
"

echo ""
echo "5. Test-Insert durchführen (ROLLBACK):"
sudo -u postgres psql -d "$DB_NAME" << 'EOF'
BEGIN;

-- Test: PLATFORM_SANDBOX sollte jetzt erlaubt sein
INSERT INTO store_payment_configurations 
    (store_id, provider, enabled, mode, connection_status)
VALUES 
    (1, 'PAYPAL', false, 'SANDBOX', 'PLATFORM_SANDBOX');

SELECT 'Test erfolgreich: PLATFORM_SANDBOX ist erlaubt' AS result;

ROLLBACK;
EOF

echo ""
echo "✅ Migration V003 erfolgreich abgeschlossen!"
echo ""
echo "Nächster Schritt: Backend testen"
echo "curl -H 'Authorization: Bearer <JWT>' https://api.markt.ma/api/stores/121/admin/payment-settings/paypal"
