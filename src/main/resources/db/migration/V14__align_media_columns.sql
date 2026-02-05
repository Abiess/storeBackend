-- V14: Align media table columns to current model (idempotent)
SET search_path TO public;

DO $$
BEGIN
  -- 1) filename
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='media' AND column_name='file_name'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='media' AND column_name='filename'
  ) THEN
    EXECUTE 'ALTER TABLE public.media RENAME COLUMN file_name TO filename';
END IF;

  -- 2) original_filename
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='media' AND column_name='original_name'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='media' AND column_name='original_filename'
  ) THEN
    EXECUTE 'ALTER TABLE public.media RENAME COLUMN original_name TO original_filename';
END IF;

  -- 3) content_type (rename from mime_type if possible)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='media' AND column_name='mime_type'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='media' AND column_name='content_type'
  ) THEN
    EXECUTE 'ALTER TABLE public.media RENAME COLUMN mime_type TO content_type';
END IF;

  -- 4) if content_type still missing, add it
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='media' AND column_name='content_type'
  ) THEN
    EXECUTE 'ALTER TABLE public.media ADD COLUMN content_type VARCHAR(100)';
END IF;

  -- 5) backfill + enforce NOT NULL
EXECUTE '
    UPDATE public.media
    SET content_type = COALESCE(content_type, ''application/octet-stream'')
    WHERE content_type IS NULL
  ';

EXECUTE 'ALTER TABLE public.media ALTER COLUMN content_type SET NOT NULL';
END $$;

COMMENT ON COLUMN public.media.content_type IS
  'MIME type of the media file (e.g., image/jpeg, video/mp4)';
