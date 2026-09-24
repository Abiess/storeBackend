-- ═══════════════════════════════════════════════════════════════════════════
-- Migration V015: Add GALLERY to store_slider_images constraint
-- ═══════════════════════════════════════════════════════════════════════════
-- 
-- PURPOSE:
-- Enable GALLERY image type for SERVICE store galleries
-- 
-- CONTEXT:
-- SliderImageType Java enum has exactly 3 values:
--   - DEFAULT (system default images, no media_id)
--   - OWNER_UPLOAD (owner uploaded images, requires media_id)
--   - GALLERY (gallery images for SERVICE stores, requires media_id)
--
-- ORIGINAL CONSTRAINT:
-- CHECK (image_type IN ('DEFAULT', 'OWNER_UPLOAD'))
--
-- PRODUCTION FIX ALREADY APPLIED:
-- This migration matches the manual fix already applied on production
-- to ensure consistency for new installations and development environments.
--
-- IDEMPOTENCY:
-- Uses IF EXISTS for safe re-execution on environments where GALLERY
-- may have been manually added already.
--
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- 1. Drop the old image_type constraint (idempotent)
ALTER TABLE store_slider_images DROP CONSTRAINT IF EXISTS chk_image_type;

-- 2. Recreate constraint with all valid SliderImageType enum values
--    ONLY: DEFAULT, OWNER_UPLOAD, GALLERY (NO HERO/SLIDER - they don't exist in Java enum)
ALTER TABLE store_slider_images ADD CONSTRAINT chk_image_type 
    CHECK (image_type IN ('DEFAULT', 'OWNER_UPLOAD', 'GALLERY'));

-- 3. Drop the old media_consistency constraint (idempotent)
ALTER TABLE store_slider_images DROP CONSTRAINT IF EXISTS chk_media_consistency;

-- 4. Recreate media_consistency constraint with correct logic:
--    DEFAULT: media_id must be NULL (system default images, no upload)
--    OWNER_UPLOAD: media_id must be NOT NULL (uploaded via MediaService)
--    GALLERY: media_id must be NOT NULL (uploaded via MediaService)
ALTER TABLE store_slider_images ADD CONSTRAINT chk_media_consistency 
    CHECK (
        (image_type = 'DEFAULT' AND media_id IS NULL) OR
        (image_type = 'OWNER_UPLOAD' AND media_id IS NOT NULL) OR
        (image_type = 'GALLERY' AND media_id IS NOT NULL)
    );

COMMIT;

-- 5. Verify the changes (optional query)
-- SELECT conname, contype, pg_get_constraintdef(oid) as definition
-- FROM pg_constraint
-- WHERE conrelid = 'store_slider_images'::regclass
--   AND contype = 'c';

-- ═══════════════════════════════════════════════════════════════════════════
-- NOTES:
-- - Existing DEFAULT/OWNER_UPLOAD rows remain unchanged
-- - GALLERY can now be inserted
-- - No data is deleted or modified
-- - Safe for environments where GALLERY may already be added manually
-- ═══════════════════════════════════════════════════════════════════════════
