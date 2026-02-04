SET search_path TO public;

DO $$
BEGIN
  -- file_name -> filename
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='media' AND column_name='file_name'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='media' AND column_name='filename'
  ) THEN
    EXECUTE 'ALTER TABLE public.media RENAME COLUMN file_name TO filename';
END IF;

  -- original_name -> original_filename
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='media' AND column_name='original_name'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='media' AND column_name='original_filename'
  ) THEN
    EXECUTE 'ALTER TABLE public.media RENAME COLUMN original_name TO original_filename';
END IF;

  -- mime_type -> media_type (optional; nur wenn du es wirklich so willst)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='media' AND column_name='mime_type'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='media' AND column_name='media_type'
  ) THEN
    EXECUTE 'ALTER TABLE public.media RENAME COLUMN mime_type TO media_type';
END IF;

  -- minio_object_name hinzufügen falls fehlt
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='media' AND column_name='minio_object_name'
  ) THEN
    EXECUTE 'ALTER TABLE public.media ADD COLUMN minio_object_name VARCHAR(500)';
END IF;

  -- content_type hinzufügen falls fehlt
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='media' AND column_name='content_type'
  ) THEN
    EXECUTE 'ALTER TABLE public.media ADD COLUMN content_type VARCHAR(100)';
END IF;
END $$;

UPDATE public.media
SET content_type = COALESCE(content_type, 'application/octet-stream')
WHERE content_type IS NULL;

ALTER TABLE public.media
    ALTER COLUMN content_type SET NOT NULL;
