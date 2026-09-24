-- ============================================================
-- Migration V008: Supplier Field Corrections (Learning System)
-- ============================================================
-- Phase 3A: Learn user corrections for supplier names
-- When OCR/parser gets supplier name wrong and user corrects it,
-- store the mapping for future invoices.

CREATE TABLE supplier_field_correction (
    id BIGSERIAL PRIMARY KEY,
    store_id BIGINT NOT NULL,
    supplier_id BIGINT NULL,
    field_type VARCHAR(50) NOT NULL,
    raw_value TEXT NOT NULL,
    normalized_raw_value TEXT NOT NULL,
    corrected_value TEXT NOT NULL,
    normalized_corrected_value TEXT NOT NULL,
    confirmation_count INTEGER NOT NULL DEFAULT 1,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by BIGINT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_supplier_field_correction_store
        FOREIGN KEY (store_id) REFERENCES store(id) ON DELETE CASCADE,

    CONSTRAINT fk_supplier_field_correction_created_by
        FOREIGN KEY (created_by) REFERENCES app_user(id) ON DELETE SET NULL,

    CONSTRAINT uq_supplier_field_correction
        UNIQUE (store_id, field_type, normalized_raw_value)
);

-- Index for fast lookup during parsing
CREATE INDEX idx_supplier_field_correction_lookup
ON supplier_field_correction (
    store_id,
    field_type,
    normalized_raw_value,
    active
) WHERE active = TRUE;

-- Add source tracking to parse results
ALTER TABLE supplier_invoice_parse_result
ADD COLUMN supplier_name_source VARCHAR(50) NULL;

COMMENT ON TABLE supplier_field_correction IS 'Learned corrections for supplier invoice fields (Phase 3A: supplier names only)';
COMMENT ON COLUMN supplier_field_correction.field_type IS 'Field type (SUPPLIER_NAME, later: INVOICE_NUMBER, etc.)';
COMMENT ON COLUMN supplier_field_correction.raw_value IS 'Original value from OCR/parser (e.g., "R wm oe GmbH")';
COMMENT ON COLUMN supplier_field_correction.normalized_raw_value IS 'Normalized raw value for matching';
COMMENT ON COLUMN supplier_field_correction.corrected_value IS 'User-confirmed correct value (e.g., "MARZOUK HANDELS GMBH")';
COMMENT ON COLUMN supplier_field_correction.normalized_corrected_value IS 'Normalized corrected value';
COMMENT ON COLUMN supplier_field_correction.confirmation_count IS 'How many times this correction was confirmed';
COMMENT ON COLUMN supplier_field_correction.active IS 'False if superseded by conflicting correction';
COMMENT ON COLUMN supplier_invoice_parse_result.supplier_name_source IS 'Source: PARSER, LEARNED_CORRECTION, USER_EDITED';
