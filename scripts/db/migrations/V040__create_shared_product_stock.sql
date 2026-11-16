-- Opt-in shared stock. No existing product or variant is migrated automatically.
BEGIN;

CREATE TABLE IF NOT EXISTS shared_product_stock (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL UNIQUE REFERENCES products(id) ON DELETE RESTRICT,
    base_stock INTEGER NOT NULL DEFAULT 0 CHECK (base_stock >= 0),
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMIT;
