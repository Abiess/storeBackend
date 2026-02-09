-- Flyway Migration V21: Recreate cart_items table with timestamps
-- Description: Complete recreation of cart_items table with created_at and updated_at
-- Created: 2026-02-09

SET search_path TO public;

-- Drop cart_items table if exists (to avoid error when recreating)
DROP TABLE IF EXISTS cart_items;

-- Create cart_items table with all columns including timestamps
CREATE TABLE cart_items (
    id BIGSERIAL PRIMARY KEY,
    cart_id BIGINT NOT NULL,
    variant_id BIGINT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    price_snapshot NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Foreign Keys
    CONSTRAINT fk_cart_items_cart FOREIGN KEY (cart_id) REFERENCES carts(id) ON DELETE CASCADE,
    CONSTRAINT fk_cart_items_variant FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX idx_cart_items_cart_id ON cart_items(cart_id);
CREATE INDEX idx_cart_items_variant_id ON cart_items(variant_id);
CREATE INDEX idx_cart_items_created_at ON cart_items(created_at);

-- Add comments for documentation
COMMENT ON TABLE cart_items IS 'Shopping cart items linking carts to product variants';
COMMENT ON COLUMN cart_items.id IS 'Primary key';
COMMENT ON COLUMN cart_items.cart_id IS 'Reference to cart';
COMMENT ON COLUMN cart_items.variant_id IS 'Reference to product variant';
COMMENT ON COLUMN cart_items.quantity IS 'Number of items';
COMMENT ON COLUMN cart_items.price_snapshot IS 'Price at time of adding to cart';
COMMENT ON COLUMN cart_items.created_at IS 'Timestamp when cart item was created';
COMMENT ON COLUMN cart_items.updated_at IS 'Timestamp when cart item was last updated';
