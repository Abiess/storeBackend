-- Migration Script - Adds missing tables/columns without data loss
-- Safe to run multiple times (idempotent)

BEGIN;

-- Add categories table if missing
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'categories') THEN
CREATE TABLE categories (
                          id BIGSERIAL PRIMARY KEY,
                          store_id BIGINT NOT NULL,
                          name VARCHAR(255) NOT NULL,
                          slug VARCHAR(255) NOT NULL,
                          parent_id BIGINT,
                          sort_order INTEGER NOT NULL DEFAULT 0,
                          description TEXT,
                          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                          CONSTRAINT fk_category_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
                          CONSTRAINT fk_category_parent FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE CASCADE,
                          CONSTRAINT uk_category_slug_per_store UNIQUE (store_id, slug)
);
CREATE INDEX IF NOT EXISTS idx_categories_store ON categories(store_id);
CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);

RAISE NOTICE '✅ Categories table created';
ELSE
        RAISE NOTICE '⚠️  Categories table already exists - skipping';
END IF;
END $$;

-- ✅ Orders: fehlende Spalten hinzufügen (fix für deine aktuellen Errors)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='orders') THEN

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema='public' AND table_name='orders' AND column_name='payment_method'
        ) THEN
ALTER TABLE public.orders ADD COLUMN payment_method VARCHAR(50);
RAISE NOTICE '✅ Added orders.payment_method';
END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema='public' AND table_name='orders' AND column_name='phone_verification_id'
        ) THEN
ALTER TABLE public.orders ADD COLUMN phone_verification_id BIGINT;
RAISE NOTICE '✅ Added orders.phone_verification_id';
END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema='public' AND table_name='orders' AND column_name='phone_verified'
        ) THEN
ALTER TABLE public.orders ADD COLUMN phone_verified BOOLEAN NOT NULL DEFAULT FALSE;
RAISE NOTICE '✅ Added orders.phone_verified';
END IF;

ELSE
        RAISE NOTICE '⚠️  orders table not found - skipping orders migration';
END IF;
END $$;

COMMIT;
