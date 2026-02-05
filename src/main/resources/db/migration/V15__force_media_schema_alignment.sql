SET search_path TO public;

DO $$
BEGIN
  -- 1) Dateinamen-Spalten hart angleichen
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

  -- 2) content_type sicherstellen (rename oder add)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='media' AND column_name='mime_type'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='media' AND column_name='content_type'
  ) THEN
    EXECUTE 'ALTER TABLE public.media RENAME COLUMN mime_type TO content_type';
END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='media' AND column_name='content_type'
  ) THEN
    EXECUTE 'ALTER TABLE public.media ADD COLUMN content_type VARCHAR(100)';
END IF;

  -- 3) Defaults & NOT NULL erzwingen
EXECUTE $$UPDATE public.media
           SET content_type = COALESCE(content_type, 'application/octet-stream')
           WHERE content_type IS NULL$$;

EXECUTE 'ALTER TABLE public.media ALTER COLUMN content_type SET NOT NULL';

-- 4) HARD FAIL wenn am Ende nicht korrekt (damit Flyway nie “grün” lügt)
IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='media' AND column_name='filename'
  ) THEN
    RAISE EXCEPTION 'media.filename fehlt nach Alignment';
END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='media' AND column_name='content_type'
  ) THEN
    RAISE EXCEPTION 'media.content_type fehlt nach Alignment';
END IF;

END $$;
