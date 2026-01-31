-- V8: Ensure content_type exists and is populated

ALTER TABLE public.media
  ADD COLUMN IF NOT EXISTS content_type VARCHAR(100);

-- Backfill from existing mime_type if present, else default
UPDATE public.media
SET content_type = COALESCE(mime_type, 'application/octet-stream')
WHERE content_type IS NULL;

-- Enforce NOT NULL after backfill
ALTER TABLE public.media
  ALTER COLUMN content_type SET NOT NULL;

COMMENT ON COLUMN public.media.content_type IS
  'MIME type of the media file (e.g., image/jpeg, video/mp4)';
