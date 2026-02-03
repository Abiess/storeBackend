-- V10: Add Marketplace Supplier/Reseller Features
-- Minimal migration to extend existing schema for marketplace functionality

SET search_path TO public;

-- Step 1: Add new roles to support SUPPLIER and RESELLER
-- (Existing roles: USER, ROLE_PLATFORM_ADMIN, ROLE_STORE_OWNER)
-- We're adding ROLE_SUPPLIER and renaming ROLE_STORE_OWNER to ROLE_RESELLER via data migration

-- No table changes needed - roles are stored in user_roles table as VARCHAR(50)

-- Step 2: Extend products table to support supplier products
-- Add columns to distinguish supplier catalog products from store-specific products
ALTER TABLE products
    ADD COLUMN IF NOT EXISTS supplier_id BIGINT,
    ADD COLUMN IF NOT EXISTS is_supplier_catalog BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS wholesale_price DECIMAL(10, 2), -- Supplier's base price for resellers
    ADD CONSTRAINT fk_products_supplier FOREIGN KEY (supplier_id) REFERENCES users(id) ON DELETE CASCADE;

-- Create index for supplier product queries
CREATE INDEX IF NOT EXISTS idx_products_supplier ON products(supplier_id) WHERE is_supplier_catalog = TRUE;
CREATE INDEX IF NOT EXISTS idx_products_catalog ON products(is_supplier_catalog);

-- Comment existing constraint to make store_id nullable for supplier products
ALTER TABLE products ALTER COLUMN store_id DROP NOT NULL;

-- Step 3: Create store_products mapping table (reseller imports supplier products)
CREATE TABLE IF NOT EXISTS store_products (
    id BIGSERIAL PRIMARY KEY,
    store_id BIGINT NOT NULL,
    supplier_product_id BIGINT NOT NULL, -- References products(id) where is_supplier_catalog = TRUE

    -- Reseller pricing
    retail_price DECIMAL(10, 2) NOT NULL, -- What customer pays
    margin_percentage DECIMAL(5, 4), -- For tracking (e.g., 0.20 = 20%)

    -- Visibility
    is_active BOOLEAN DEFAULT TRUE,

    -- Timestamps
    imported_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_store_products_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
    CONSTRAINT fk_store_products_supplier_product FOREIGN KEY (supplier_product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT uq_store_product UNIQUE (store_id, supplier_product_id) -- Can't import same product twice
);

CREATE INDEX IF NOT EXISTS idx_store_products_store ON store_products(store_id, is_active);
CREATE INDEX IF NOT EXISTS idx_store_products_supplier ON store_products(supplier_product_id);

-- Step 4: Create commissions table (revenue split tracking)
CREATE TABLE IF NOT EXISTS commissions (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL,
    order_item_id BIGINT NOT NULL,

    -- Commission recipient
    recipient_type VARCHAR(20) NOT NULL, -- SUPPLIER, RESELLER, PLATFORM
    recipient_id BIGINT, -- user_id for SUPPLIER, store_id for RESELLER, NULL for PLATFORM

    -- Amounts
    amount DECIMAL(10, 2) NOT NULL,
    percentage DECIMAL(5, 4), -- For audit trail

    -- Status
    status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, APPROVED, PAID, CANCELLED

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    approved_at TIMESTAMP,
    paid_at TIMESTAMP,

    CONSTRAINT fk_commissions_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    CONSTRAINT fk_commissions_order_item FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE CASCADE,
    CONSTRAINT chk_recipient_type CHECK (recipient_type IN ('SUPPLIER', 'RESELLER', 'PLATFORM'))
);

CREATE INDEX IF NOT EXISTS idx_commissions_order ON commissions(order_id);
CREATE INDEX IF NOT EXISTS idx_commissions_recipient ON commissions(recipient_type, recipient_id, status);
CREATE INDEX IF NOT EXISTS idx_commissions_status ON commissions(status);

-- Step 5: Extend order_items to track revenue split
ALTER TABLE order_items
    ADD COLUMN IF NOT EXISTS store_product_id BIGINT, -- Reference to imported product
    ADD COLUMN IF NOT EXISTS supplier_id BIGINT, -- Snapshot: who supplied this
    ADD COLUMN IF NOT EXISTS wholesale_price DECIMAL(10, 2), -- Snapshot: supplier's price
    ADD COLUMN IF NOT EXISTS platform_fee_percentage DECIMAL(5, 4) DEFAULT 0.05, -- 5% default
    ADD CONSTRAINT fk_order_items_store_product FOREIGN KEY (store_product_id) REFERENCES store_products(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_order_items_store_product ON order_items(store_product_id);
CREATE INDEX IF NOT EXISTS idx_order_items_supplier ON order_items(supplier_id);

-- Step 6: Data migration - rename ROLE_STORE_OWNER to ROLE_RESELLER
UPDATE user_roles SET role = 'ROLE_RESELLER' WHERE role = 'ROLE_STORE_OWNER';

-- Step 7: Add platform settings table (global configuration)
CREATE TABLE IF NOT EXISTS platform_settings (
    id BIGSERIAL PRIMARY KEY,
    key VARCHAR(100) NOT NULL UNIQUE,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Insert default platform fee
INSERT INTO platform_settings (key, value, description)
VALUES ('platform_fee_percentage', '0.05', 'Platform commission percentage (5%)');

-- Insert recommended margin for resellers
INSERT INTO platform_settings (key, value, description)
VALUES ('recommended_reseller_margin', '0.30', 'Recommended reseller markup (30%)');

-- Comments for documentation
COMMENT ON TABLE store_products IS 'Maps supplier products to reseller stores with custom pricing';
COMMENT ON TABLE commissions IS 'Tracks revenue split: supplier gets wholesale_price, reseller gets margin, platform gets fee';
COMMENT ON COLUMN products.is_supplier_catalog IS 'TRUE = supplier product in catalog, FALSE = reseller-owned product';
COMMENT ON COLUMN products.wholesale_price IS 'Supplier base price that resellers pay (not visible to customers)';
COMMENT ON COLUMN order_items.store_product_id IS 'NULL for direct store products, set for imported supplier products';

