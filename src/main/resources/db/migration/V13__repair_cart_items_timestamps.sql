-- V13: Repair cart_items timestamps (created_at, updated_at)
SET search_path TO public;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='cart_items' AND column_name='created_at'
  ) THEN
ALTER TABLE public.cart_items
    ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;
END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='cart_items' AND column_name='updated_at'
  ) THEN
ALTER TABLE public.cart_items
    ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;
END IF;
END $$;

-- Optional: Default wieder entfernen, wenn du das nicht dauerhaft willst
ALTER TABLE public.cart_items ALTER COLUMN created_at DROP DEFAULT;
ALTER TABLE public.cart_items ALTER COLUMN updated_at DROP DEFAULT;
