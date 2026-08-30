-- Migration: Add GALLERY to store_slider_images image_type constraint
-- Version: V015
-- Created: 2026-08-30
-- Purpose: Allow GALLERY as valid image_type value for SERVICE store galleries
-- Context: SliderImageType Java enum has: DEFAULT, OWNER_UPLOAD, GALLERY

-- Drop the old constraint (idempotent - IF EXISTS)
ALTER TABLE store_slider_images DROP CONSTRAINT IF EXISTS chk_image_type;

-- Recreate constraint with all valid image_type values from SliderImageType enum
-- IMPORTANT: Only DEFAULT, OWNER_UPLOAD, GALLERY exist in Java enum
ALTER TABLE store_slider_images ADD CONSTRAINT chk_image_type 
    CHECK (image_type IN ('DEFAULT', 'OWNER_UPLOAD', 'GALLERY'));

-- Drop the old media_consistency constraint (idempotent - IF EXISTS)
ALTER TABLE store_slider_images DROP CONSTRAINT IF EXISTS chk_media_consistency;

-- Recreate media_consistency constraint with updated logic:
-- DEFAULT: media_id must be NULL (system default images)
-- OWNER_UPLOAD: media_id must be NOT NULL (owner uploaded images)
-- GALLERY: media_id must be NOT NULL (gallery images are always uploaded)
ALTER TABLE store_slider_images ADD CONSTRAINT chk_media_consistency 
    CHECK (
        (image_type = 'DEFAULT' AND media_id IS NULL) OR
        (image_type = 'OWNER_UPLOAD' AND media_id IS NOT NULL) OR
        (image_type = 'GALLERY' AND media_id IS NOT NULL)
    );
