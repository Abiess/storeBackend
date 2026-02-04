SET search_path TO public;

DO $$
BEGIN
  -- rename columns
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='media' AND column_name='file_name'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='media' AND column_name='filename'
  ) THEN
    EXECUTE 'ALTER TABLE public.media RENAME COLUMN file_name TO filename';
END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='media' AND column_name='original_name'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='media' AND column_name='original_filename'
  ) THEN
    EXECUTE 'ALTER TABLE public.media RENAME COLUMN original_name TO original_filename';
END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='media' AND column_name='mime_type'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='media' AND column_name='content_type'
  ) THEN
    EXECUTE 'ALTER TABLE public.media RENAME COLUMN mime_type TO content_type';
END IF;

  -- add missing columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='media' AND column_name='minio_object_name'
  ) THEN
    EXECUTE 'ALTER TABLE public.media ADD COLUMN minio_object_name VARCHAR(500)';
END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='media' AND column_name='media_type'
  ) THEN
    EXECUTE 'ALTER TABLE public.media ADD COLUMN media_type VARCHAR(50)';
END IF;

  -- ensure content_type not null if column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='media' AND column_name='content_type'
  ) THEN
    EXECUTE 'UPDATE public.media
             SET content_type = COALESCE(content_type, ''application/octet-stream'')
             WHERE content_type IS NULL';
EXECUTE 'ALTER TABLE public.media ALTER COLUMN content_type SET NOT NULL';
END IF;
END $$;
