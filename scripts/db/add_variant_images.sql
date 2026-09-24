-- Migration: Füge image_url zu product_variants hinzu
-- Datum: 2026-03-29
-- Für PostgreSQL
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='product_variants' AND column_name='image_url'
    ) THEN
        ALTER TABLE product_variants ADD COLUMN image_url VARCHAR(500);
        RAISE NOTICE 'Spalte image_url wurde zu product_variants hinzugefügt';
    ELSE
        RAISE NOTICE 'Spalte image_url existiert bereits';
    END IF;
END $$;
-- Für H2 (Local Development)
-- ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS image_url VARCHAR(500);
