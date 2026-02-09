-- ==================================================================================
-- V18: Fix cart_items missing columns
-- ==================================================================================
-- Problem: cart_items Tabelle wurde manuell erstellt und hat keine created_at/updated_at
-- Lösung: Spalten idempotent hinzufügen
-- ==================================================================================

-- Füge created_at Spalte hinzu (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'cart_items'
        AND column_name = 'created_at'
    ) THEN
        ALTER TABLE cart_items
        ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;
        RAISE NOTICE 'Spalte created_at zu cart_items hinzugefügt';
    END IF;
END $$;

-- Füge updated_at Spalte hinzu (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'cart_items'
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE cart_items
        ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;
        RAISE NOTICE 'Spalte updated_at zu cart_items hinzugefügt';
    END IF;
END $$;

