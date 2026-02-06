-- Flyway Migration V18: Fix inventory_logs column name
-- Description: Drops and recreates inventory_logs table with correct column name 'logged_at'
-- Reason: Legacy table has 'timestamp' column, but code expects 'logged_at'
-- Safe to drop: No production data yet

SET search_path TO public;

-- Drop existing table (safe - no important data)
DROP TABLE IF EXISTS inventory_logs CASCADE;

-- Recreate with correct structure
CREATE TABLE inventory_logs (
    id BIGSERIAL PRIMARY KEY,
    variant_id BIGINT NOT NULL,
    quantity_change INTEGER NOT NULL,
    reason VARCHAR(50) NOT NULL,
    user_id BIGINT,
    notes TEXT,
    logged_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_inventory_logs_variant FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE,
    CONSTRAINT fk_inventory_logs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_inventory_logs_variant ON inventory_logs(variant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_logged_at ON inventory_logs(logged_at);

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ V18: inventory_logs table recreated with logged_at column';
END $$;

