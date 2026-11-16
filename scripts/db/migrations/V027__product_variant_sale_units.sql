-- Optional sale-unit metadata for existing product variants.
-- Legacy rows retain NULL values and their previous behavior.
BEGIN;

ALTER TABLE product_variants
    ADD COLUMN IF NOT EXISTS sale_unit VARCHAR(40);

ALTER TABLE product_variants
    ADD COLUMN IF NOT EXISTS base_unit_factor NUMERIC(12, 3);

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ck_product_variants_base_unit_factor'
          AND conrelid = 'product_variants'::regclass
    ) THEN
        ALTER TABLE product_variants
            ADD CONSTRAINT ck_product_variants_base_unit_factor
            CHECK (base_unit_factor IS NULL OR base_unit_factor > 0);
    END IF;
END $$;

COMMIT;
