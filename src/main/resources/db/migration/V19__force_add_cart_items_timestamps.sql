-- ==================================================================================
-- V19: Force add cart_items timestamps
-- ==================================================================================
-- Problem: V18 lief, aber Spalten fehlen immer noch (Drop-Script hat sie entfernt)
-- Lösung: Spalten mit absoluter Sicherheit hinzufügen
-- ==================================================================================

-- Prüfe und füge created_at hinzu
DO $$
DECLARE
    column_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'cart_items'
        AND column_name = 'created_at'
    ) INTO column_exists;

    IF NOT column_exists THEN
        ALTER TABLE cart_items
        ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;
        RAISE NOTICE '✓ Spalte created_at zu cart_items hinzugefügt';
    ELSE
        RAISE NOTICE '✓ Spalte created_at existiert bereits';
    END IF;
END $$;

-- Prüfe und füge updated_at hinzu
DO $$
DECLARE
    column_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'cart_items'
        AND column_name = 'updated_at'
    ) INTO column_exists;

    IF NOT column_exists THEN
        ALTER TABLE cart_items
        ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;
        RAISE NOTICE '✓ Spalte updated_at zu cart_items hinzugefügt';
    ELSE
        RAISE NOTICE '✓ Spalte updated_at existiert bereits';
    END IF;
END $$;

