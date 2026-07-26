-- Phase 4A: Supplier Invoice Import Log
-- Protokolliert alle importierten Rechnungspositionen und verhindert Doppelbuchung

CREATE TABLE supplier_invoice_line_import (
    id BIGSERIAL PRIMARY KEY,
    
    -- References
    store_id BIGINT NOT NULL,
    document_id BIGINT NOT NULL,
    line_id BIGINT NOT NULL,
    product_id BIGINT,
    
    -- Import action
    action VARCHAR(50) NOT NULL, -- CREATE_PRODUCT | UPDATE_STOCK
    
    -- Stock changes
    stock_before INTEGER,
    stock_change INTEGER NOT NULL,
    stock_after INTEGER,
    
    -- Purchase price
    purchase_price DECIMAL(10,2),
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'SUCCESS', -- SUCCESS | FAILED
    error_message TEXT,
    
    -- Audit
    imported_at TIMESTAMP NOT NULL DEFAULT NOW(),
    imported_by BIGINT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    -- Foreign Keys
    CONSTRAINT fk_invoice_import_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
    CONSTRAINT fk_invoice_import_document FOREIGN KEY (document_id) REFERENCES supplier_invoice_documents(id) ON DELETE CASCADE,
    CONSTRAINT fk_invoice_import_line FOREIGN KEY (line_id) REFERENCES supplier_invoice_lines(id) ON DELETE CASCADE,
    CONSTRAINT fk_invoice_import_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
    CONSTRAINT fk_invoice_import_user FOREIGN KEY (imported_by) REFERENCES users(id) ON DELETE SET NULL,
    
    -- Prevent double booking: same line cannot be imported twice
    CONSTRAINT uq_invoice_line_import UNIQUE (document_id, line_id)
);

-- Index for querying imports by document
CREATE INDEX idx_invoice_import_document ON supplier_invoice_line_import(document_id);

-- Index for querying imports by store
CREATE INDEX idx_invoice_import_store ON supplier_invoice_line_import(store_id);

-- Index for querying imports by product (e.g., product history)
CREATE INDEX idx_invoice_import_product ON supplier_invoice_line_import(product_id);

COMMENT ON TABLE supplier_invoice_line_import IS 'Phase 4A: Tracks imported invoice lines and prevents double booking via UNIQUE constraint on (document_id, line_id)';
COMMENT ON CONSTRAINT uq_invoice_line_import ON supplier_invoice_line_import IS 'Prevents same invoice line from being imported twice (double stock booking)';
