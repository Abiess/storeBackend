-- Migration: Füge media_urls zu product_variants hinzu
-- Datum: 2026-03-29
-- Zweck: Ermöglicht mehrere Bilder pro Variante (JSON-Array)

-- Prüfe ob Spalte bereits existiert (PostgreSQL)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='product_variants' AND column_name='media_urls'
    ) THEN
        ALTER TABLE product_variants ADD COLUMN media_urls TEXT;
        RAISE NOTICE 'Spalte media_urls zu product_variants hinzugefügt';
    ELSE
        RAISE NOTICE 'Spalte media_urls existiert bereits';
    END IF;
END $$;

-- Migriere existierende imageUrl zu mediaUrls (falls vorhanden)
-- Format: ["url1", "url2", ...] als JSON
UPDATE product_variants
SET media_urls = CONCAT('["', image_url, '"]')
WHERE image_url IS NOT NULL
  AND (media_urls IS NULL OR media_urls = '');

COMMENT ON COLUMN product_variants.media_urls IS 'JSON array of image URLs for this variant, e.g. ["url1", "url2"]';

