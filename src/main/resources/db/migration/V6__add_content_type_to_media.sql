-- Flyway Migration V6: Add content_type column to media table
-- Fixes missing column error when Hibernate tries to insert into media table

SET search_path TO public;

-- Add content_type column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'media'
        AND column_name = 'content_type'
    ) THEN
        ALTER TABLE media
        ADD COLUMN content_type VARCHAR(100) NOT NULL DEFAULT 'application/octet-stream';

        RAISE NOTICE 'Added content_type column to media table';
    ELSE
        RAISE NOTICE 'content_type column already exists in media table';
    END IF;
END $$;

-- Remove default after adding the column (we only needed it for existing rows)
ALTER TABLE media ALTER COLUMN content_type DROP DEFAULT;

-- Add comment for documentation
COMMENT ON COLUMN media.content_type IS 'MIME type of the media file (e.g., image/jpeg, video/mp4)';

