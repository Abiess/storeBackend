-- Migration V011: Allow supplier_product_mapping without product_id
-- 
-- Enables storing learned master data (description, unit, VPE, tax rate)
-- without requiring a product assignment.
-- 
-- Use case: User corrects OCR-detected values and wants to remember them
-- for future invoices, but hasn't assigned a store product yet.
--
-- product_id can be added later when the user assigns a product.

ALTER TABLE supplier_product_mapping
    ALTER COLUMN product_id DROP NOT NULL;

COMMENT ON COLUMN supplier_product_mapping.product_id IS 
    'Optional reference to store product. NULL if only master data is learned without product assignment.';
