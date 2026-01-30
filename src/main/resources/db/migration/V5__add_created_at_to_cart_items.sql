-- Flyway Migration V5: Add missing created_at column to cart_items
-- Created: 2026-01-30
-- Description: Fixes SchemaManagementException - cart_items missing created_at/updated_at columns

-- Explizit public Schema setzen
SET search_path TO public;

-- Add created_at column (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'cart_items'
          AND column_name = 'created_at'
    ) THEN
        ALTER TABLE cart_items
        ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

        RAISE NOTICE 'Added created_at column to cart_items';
    ELSE
        RAISE NOTICE 'Column created_at already exists in cart_items - skipping';
    END IF;
END $$;

-- Add updated_at column (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'cart_items'
          AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE cart_items
        ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

        RAISE NOTICE 'Added updated_at column to cart_items';
    ELSE
        RAISE NOTICE 'Column updated_at already exists in cart_items - skipping';
    END IF;
END $$;

-- Add index for created_at (optional, for queries)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_cart_items_created_at') THEN
        CREATE INDEX idx_cart_items_created_at ON cart_items(created_at);
        RAISE NOTICE 'Created index idx_cart_items_created_at';
    END IF;
END $$;

-- Verify columns exist
DO $$
DECLARE
    created_exists BOOLEAN;
    updated_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'cart_items' AND column_name = 'created_at'
    ) INTO created_exists;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'cart_items' AND column_name = 'updated_at'
    ) INTO updated_exists;

    IF created_exists AND updated_exists THEN
        RAISE NOTICE '✅ V5 Migration successful - cart_items now has created_at and updated_at';
    ELSE
        RAISE EXCEPTION 'V5 Migration failed - columns missing';
    END IF;
END $$;

