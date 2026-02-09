-- ==================================================================================
-- V20: Final fix for cart_items timestamps (idempotent)
-- ==================================================================================
-- Problem: V18 und V19 wurden als ausgeführt markiert, aber Spalten fehlen
-- Root Cause: Flyway History != tatsächlicher Schema-Status
-- Lösung: Idempotente Migration die immer funktioniert
-- ==================================================================================

-- Lösche created_at falls vorhanden (für sauberen Neustart)
ALTER TABLE cart_items DROP COLUMN IF EXISTS created_at;

-- Lösche updated_at falls vorhanden (für sauberen Neustart)
ALTER TABLE cart_items DROP COLUMN IF EXISTS updated_at;

-- Füge created_at hinzu
ALTER TABLE cart_items
ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Füge updated_at hinzu
ALTER TABLE cart_items
ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Setze Standardwerte für bestehende Einträge
UPDATE cart_items
SET created_at = CURRENT_TIMESTAMP,
    updated_at = CURRENT_TIMESTAMP
WHERE created_at IS NULL OR updated_at IS NULL;

-- Bestätige Erfolg
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'cart_items' AND column_name = 'created_at'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'cart_items' AND column_name = 'updated_at'
    ) THEN
        RAISE NOTICE '✅ V20: cart_items timestamps erfolgreich hinzugefügt';
    ELSE
        RAISE EXCEPTION '❌ V20: Spalten konnten nicht hinzugefügt werden';
    END IF;
END $$;

