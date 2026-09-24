-- Supplier Product Mapping Table
-- Stores learned associations between supplier article numbers and store products

CREATE TABLE IF NOT EXISTS supplier_product_mapping (
    id BIGSERIAL PRIMARY KEY,
    store_id BIGINT NOT NULL,
    
    -- Supplier identification
    supplier_name VARCHAR(255) NOT NULL,
    normalized_supplier_name VARCHAR(255) NOT NULL,
    supplier_article_number VARCHAR(100) NOT NULL,
    
    -- Product identification (optional normalized description for fallback matching)
    normalized_description VARCHAR(500),
    
    -- Mapped product
    product_id BIGINT NOT NULL,
    
    -- Additional context
    packaging_unit DECIMAL(19, 4),
    unit VARCHAR(50),
    tax_rate DECIMAL(5, 2),
    
    -- Learning metadata
    confirmation_count INT DEFAULT 1 NOT NULL,
    active BOOLEAN DEFAULT TRUE NOT NULL,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    -- Constraints
    CONSTRAINT fk_supplier_product_mapping_store 
        FOREIGN KEY (store_id) REFERENCES store(id) ON DELETE CASCADE,
    CONSTRAINT fk_supplier_product_mapping_product 
        FOREIGN KEY (product_id) REFERENCES product(id) ON DELETE CASCADE,
    
    -- Unique constraint: one mapping per store + supplier + article number
    CONSTRAINT uq_supplier_product_mapping 
        UNIQUE (store_id, normalized_supplier_name, supplier_article_number)
);

-- Indices for lookup performance
CREATE INDEX IF NOT EXISTS idx_supplier_product_mapping_store 
    ON supplier_product_mapping(store_id);

CREATE INDEX IF NOT EXISTS idx_supplier_product_mapping_lookup 
    ON supplier_product_mapping(store_id, normalized_supplier_name, supplier_article_number);

CREATE INDEX IF NOT EXISTS idx_supplier_product_mapping_product 
    ON supplier_product_mapping(product_id);

-- Update line status enum
ALTER TABLE supplier_invoice_line 
    ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'UNREVIEWED' NOT NULL;

ALTER TABLE supplier_invoice_line 
    ADD COLUMN IF NOT EXISTS mapping_source VARCHAR(50);

ALTER TABLE supplier_invoice_line 
    ADD COLUMN IF NOT EXISTS suggested_product_id BIGINT;

ALTER TABLE supplier_invoice_line 
    ADD COLUMN IF NOT EXISTS user_corrected BOOLEAN DEFAULT FALSE NOT NULL;

-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_supplier_invoice_line_status
    ON supplier_invoice_line(document_id, status);
