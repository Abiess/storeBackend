-- V003: Extend store_payment_configurations connection_status constraint
-- Fügt PLATFORM_SANDBOX als erlaubten Wert hinzu
-- WICHTIG: Production verwendet anderen Constraint-Namen als Dev-Schema

-- 1. Beide möglichen Constraint-Namen defensiv droppen
ALTER TABLE store_payment_configurations 
    DROP CONSTRAINT IF EXISTS store_payment_configurations_connection_status_check;

ALTER TABLE store_payment_configurations 
    DROP CONSTRAINT IF EXISTS chk_store_payment_connection_status;

-- 2. Neuen Constraint mit Production-Namen erstellen
ALTER TABLE store_payment_configurations
    ADD CONSTRAINT store_payment_configurations_connection_status_check
    CHECK (connection_status IN ('NOT_CONNECTED', 'PLATFORM_SANDBOX', 'CONNECTED', 'ERROR'));

-- Verifizierung:
-- SELECT conname, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conrelid = 'store_payment_configurations'::regclass
--   AND conname LIKE '%connection_status%';
