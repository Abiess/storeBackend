-- Migration: Add GALLERY, HERO, SLIDER to store_slider_images image_type constraint
-- Version: V015
-- Created: 2026-08-30
-- Purpose: Allow GALLERY, HERO, SLIDER as valid image_type values

-- Drop the old constraint
ALTER TABLE store_slider_images DROP CONSTRAINT IF EXISTS chk_image_type;

-- Recreate constraint with all valid image_type values
ALTER TABLE store_slider_images ADD CONSTRAINT chk_image_type 
    CHECK (image_type IN ('DEFAULT', 'OWNER_UPLOAD', 'HERO', 'SLIDER', 'GALLERY'));

-- Drop the old media_consistency constraint (it's too restrictive)
ALTER TABLE store_slider_images DROP CONSTRAINT IF EXISTS chk_media_consistency;

-- Recreate media_consistency constraint with updated logic:
-- DEFAULT: media_id must be NULL
-- All other types (OWNER_UPLOAD, HERO, SLIDER, GALLERY): media_id can be NULL or NOT NULL
ALTER TABLE store_slider_images ADD CONSTRAINT chk_media_consistency 
    CHECK (
        (image_type = 'DEFAULT' AND media_id IS NULL) OR
        (image_type IN ('OWNER_UPLOAD', 'HERO', 'SLIDER', 'GALLERY'))
    );
