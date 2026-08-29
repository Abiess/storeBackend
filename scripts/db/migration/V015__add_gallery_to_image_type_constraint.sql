-- ═══════════════════════════════════════════════════════════════════════════
-- MANUAL FIX: Add GALLERY, HERO, SLIDER to store_slider_images constraint
-- ═══════════════════════════════════════════════════════════════════════════
-- 
-- PROBLEM:
-- Gallery-Upload schlägt fehl mit:
-- ERROR: new row violates check constraint "chk_image_type"
-- Failing row: image_type = GALLERY
--
-- URSACHE:
-- Der bestehende CHECK Constraint erlaubt nur 'DEFAULT' und 'OWNER_UPLOAD'
--
-- LÖSUNG:
-- Constraint mit GALLERY, HERO, SLIDER erweitern
--
-- AUSFÜHRUNG:
-- psql -U storeapp -d storedb -f V015__add_gallery_to_image_type_constraint.sql
-- ODER manuell in psql/pgAdmin ausführen
--
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- 1. Drop the old constraint
ALTER TABLE store_slider_images DROP CONSTRAINT IF EXISTS chk_image_type;

-- 2. Recreate constraint with all valid image_type values
ALTER TABLE store_slider_images ADD CONSTRAINT chk_image_type 
    CHECK (image_type IN ('DEFAULT', 'OWNER_UPLOAD', 'HERO', 'SLIDER', 'GALLERY'));

-- 3. Drop the old media_consistency constraint (it's too restrictive)
ALTER TABLE store_slider_images DROP CONSTRAINT IF EXISTS chk_media_consistency;

-- 4. Recreate media_consistency constraint with updated logic:
--    DEFAULT: media_id must be NULL
--    All other types: media_id can be NULL or NOT NULL
ALTER TABLE store_slider_images ADD CONSTRAINT chk_media_consistency 
    CHECK (
        (image_type = 'DEFAULT' AND media_id IS NULL) OR
        (image_type IN ('OWNER_UPLOAD', 'HERO', 'SLIDER', 'GALLERY'))
    );

COMMIT;

-- 5. Verify the changes
SELECT conname, contype, pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'store_slider_images'::regclass
  AND contype = 'c';

-- Expected output:
-- chk_image_type | c | CHECK ((image_type)::text = ANY ((ARRAY['DEFAULT'::character varying, 'OWNER_UPLOAD'::character varying, 'HERO'::character varying, 'SLIDER'::character varying, 'GALLERY'::character varying])::text[]))
-- chk_media_consistency | c | CHECK (...)

-- ═══════════════════════════════════════════════════════════════════════════
-- NOTES:
-- - Bestehende HERO/SLIDER Rows bleiben unverändert
-- - DEFAULT/OWNER_UPLOAD Rows bleiben unverändert
-- - GALLERY kann jetzt eingefügt werden
-- - Keine Daten werden gelöscht
-- ═══════════════════════════════════════════════════════════════════════════
