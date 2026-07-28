-- V012: Create product_tier_prices table for volume/quantity pricing
-- 
-- Enables stores to define volume discounts for products:
-- Example: 
--   Standard price: €3.99
--   From 12 pieces: €3.49 per piece
--   From 24 pieces: €2.99 per piece
--   From 48 pieces: €2.49 per piece

CREATE TABLE IF NOT EXISTS product_tier_prices (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL,
    minimum_quantity INTEGER NOT NULL,
    unit_price NUMERIC(10,2) NOT NULL,
    label VARCHAR(100),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key to products table
    CONSTRAINT fk_product_tier_price_product
        FOREIGN KEY (product_id) 
        REFERENCES products(id) 
        ON DELETE CASCADE,
    
    -- Business rules: No duplicate minimum quantities per product
    CONSTRAINT uq_product_tier_price_product_quantity
        UNIQUE (product_id, minimum_quantity),
    
    -- Business rules: Minimum quantity must be > 1 (1 = base price)
    CONSTRAINT chk_product_tier_price_minimum_quantity
        CHECK (minimum_quantity > 1),
    
    -- Business rules: Unit price cannot be negative
    CONSTRAINT chk_product_tier_price_unit_price
        CHECK (unit_price >= 0)
);

-- Index for efficient tier price lookups
CREATE INDEX IF NOT EXISTS idx_product_tier_prices_product_id 
    ON product_tier_prices(product_id);

-- Index for active tier prices (most common query)
CREATE INDEX IF NOT EXISTS idx_product_tier_prices_product_active 
    ON product_tier_prices(product_id, active);

-- Index for sorting by minimum quantity
CREATE INDEX IF NOT EXISTS idx_product_tier_prices_product_minqty 
    ON product_tier_prices(product_id, minimum_quantity);

-- Comment for documentation
COMMENT ON TABLE product_tier_prices IS 
    'Volume/quantity pricing tiers for products. Allows stores to offer discounts based on order quantity.';

COMMENT ON COLUMN product_tier_prices.minimum_quantity IS 
    'Minimum quantity required to activate this tier price. Must be > 1 (1 = base price).';

COMMENT ON COLUMN product_tier_prices.unit_price IS 
    'Price per unit when this tier is reached. Applied to entire order quantity.';

COMMENT ON COLUMN product_tier_prices.label IS 
    'Optional display label for this tier (e.g., "Bulk discount", "Wholesale price").';

COMMENT ON COLUMN product_tier_prices.active IS 
    'Whether this tier price is currently active. Inactive tiers are not used in price calculation.';

COMMENT ON COLUMN product_tier_prices.sort_order IS 
    'Display order for UI. Typically matches minimum_quantity for ascending sort.';
