SET search_path TO public;

-- 🔥 harte Korrektur ohne IFs

ALTER TABLE public.media
    RENAME COLUMN file_name TO filename;

ALTER TABLE public.media
    RENAME COLUMN original_name TO original_filename;

ALTER TABLE public.media
    RENAME COLUMN mime_type TO content_type;

ALTER TABLE public.media
    ALTER COLUMN content_type SET NOT NULL;
