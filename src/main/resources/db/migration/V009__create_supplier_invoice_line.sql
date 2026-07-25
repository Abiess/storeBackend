-- Phase 3B-1: Produktpositionen aus Rechnungen extrahieren
-- Speichert erkannte Rechnungspositionen aus OCR-Parsing

CREATE TABLE supplier_invoice_line (
    id BIGSERIAL PRIMARY KEY,
    store_id BIGINT NOT NULL,
    document_id BIGINT NOT NULL,
    parse_result_id BIGINT NULL,
    
    -- Position data
    position_number INTEGER NOT NULL,
    supplier_article_number VARCHAR(100),
    description TEXT,
    
    -- Quantities
    quantity NUMERIC(19, 3),
    unit VARCHAR(50),
    packaging_unit NUMERIC(19, 2),
    
    -- Prices (BigDecimal for money)
    unit_price NUMERIC(19, 4),
    line_total NUMERIC(19, 4),
    tax_rate NUMERIC(5, 2),
    discount NUMERIC(5, 2) DEFAULT 0,
    
    -- Parser metadata
    confidence DOUBLE PRECISION DEFAULT 0.0,
    raw_text TEXT,
    warnings_json TEXT,
    
    -- Audit
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign keys
    CONSTRAINT fk_supplier_invoice_line_store
        FOREIGN KEY (store_id) REFERENCES store(id) ON DELETE CASCADE,
    
    CONSTRAINT fk_supplier_invoice_line_document
        FOREIGN KEY (document_id) REFERENCES supplier_invoice_document(id) ON DELETE CASCADE,
    
    CONSTRAINT fk_supplier_invoice_line_parse_result
        FOREIGN KEY (parse_result_id) REFERENCES supplier_invoice_parse_result(id) ON DELETE CASCADE,
    
    -- One position number per document
    CONSTRAINT uq_supplier_invoice_line_position
        UNIQUE (document_id, position_number)
);

-- Index for fast retrieval by document
CREATE INDEX idx_supplier_invoice_line_document
ON supplier_invoice_line (document_id, position_number);

-- Index for article number lookups (future Phase 3B-2)
CREATE INDEX idx_supplier_invoice_line_article
ON supplier_invoice_line (store_id, supplier_article_number);

COMMENT ON TABLE supplier_invoice_line IS 'Parsed invoice line items from OCR (Phase 3B-1)';
COMMENT ON COLUMN supplier_invoice_line.confidence IS 'Parser confidence 0.0-1.0';
COMMENT ON COLUMN supplier_invoice_line.warnings_json IS 'JSON array of validation warnings';
