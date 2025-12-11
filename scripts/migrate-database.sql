-- Migration Script - Adds missing tables without data loss
-- This script is safe to run multiple times

-- Add categories table if missing
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'categories') THEN
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
        CREATE INDEX idx_categories_store ON categories(store_id);
        CREATE INDEX idx_categories_parent ON categories(parent_id);
        CREATE INDEX idx_categories_slug ON categories(slug);
        GRANT ALL PRIVILEGES ON categories TO storeapp;
        GRANT ALL PRIVILEGES ON SEQUENCE categories_id_seq TO storeapp;
        RAISE NOTICE '✅ Categories table created';
    ELSE
        RAISE NOTICE '⚠️  Categories table already exists - skipping';
    END IF;
END $$;

-- Add other missing tables here in the future
-- Example: Add new feature tables without dropping existing data

RAISE NOTICE '✅ Migration completed successfully';

