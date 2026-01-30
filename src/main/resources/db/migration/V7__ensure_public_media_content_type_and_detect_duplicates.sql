-- V7: Ensure public.media has content_type and print diagnostics about duplicate media tables
SET search_path TO public;

DO $$
DECLARE
rec RECORD;
  other_count INT;
BEGIN
  RAISE NOTICE 'V7: Checking for tables named "media" across schemas...';

  other_count := 0;

FOR rec IN
SELECT table_schema
FROM information_schema.tables
WHERE table_type = 'BASE TABLE'
  AND table_name = 'media'
ORDER BY table_schema
    LOOP
    RAISE NOTICE 'Found media table in schema: %', rec.table_schema;

IF rec.table_schema <> 'public' THEN
      other_count := other_count + 1;
END IF;
END LOOP;

  IF other_count > 0 THEN
    RAISE NOTICE 'WARNING: Found % additional media table(s) outside public. Hibernate might be using a different schema via search_path/default_schema.', other_count;
ELSE
    RAISE NOTICE 'OK: Only public.media found.';
END IF;

  -- Ensure we have the target table
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'media'
  ) THEN
    RAISE EXCEPTION 'public.media does not exist - cannot add content_type';
END IF;

  -- Add column if missing
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'media'
      AND column_name = 'content_type'
  ) THEN
    RAISE NOTICE 'Adding column public.media.content_type...';
ALTER TABLE public.media
    ADD COLUMN content_type VARCHAR(100);
ELSE
    RAISE NOTICE 'Column public.media.content_type already exists.';
END IF;

  -- Fill NULLs
  RAISE NOTICE 'Backfilling NULL content_type values in public.media...';
EXECUTE $q$
UPDATE public.media
SET content_type = COALESCE(content_type, 'application/octet-stream')
WHERE content_type IS NULL
    $q$;

-- Enforce NOT NULL
RAISE NOTICE 'Setting public.media.content_type to NOT NULL...';
ALTER TABLE public.media
    ALTER COLUMN content_type SET NOT NULL;

RAISE NOTICE 'V7 complete.';
END $$;
