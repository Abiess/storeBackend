-- V013: Add B2B fields for orders and addresses

-- Add customer_reference to orders table
ALTER TABLE orders ADD COLUMN customer_reference VARCHAR(100);

-- Add company to shipping address (embedded Address)
ALTER TABLE orders ADD COLUMN shipping_company VARCHAR(200);

-- Add company to billing address (embedded Address)
ALTER TABLE orders ADD COLUMN billing_company VARCHAR(200);

-- Index for customer_reference search
CREATE INDEX idx_orders_customer_reference ON orders(customer_reference);
