-- Additive Store settings for the under-construction storefront mode.
-- Existing stores remain in normal storefront mode after this migration.
BEGIN;

ALTER TABLE stores
    ADD COLUMN IF NOT EXISTS maintenance_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS maintenance_mode VARCHAR(20) NOT NULL DEFAULT 'DEFAULT',
    ADD COLUMN IF NOT EXISTS maintenance_image_media_id BIGINT;

ALTER TABLE stores
    DROP CONSTRAINT IF EXISTS ck_stores_maintenance_mode;

ALTER TABLE stores
    ADD CONSTRAINT ck_stores_maintenance_mode
        CHECK (maintenance_mode IN ('DEFAULT', 'CUSTOM_IMAGE'));

COMMIT;
