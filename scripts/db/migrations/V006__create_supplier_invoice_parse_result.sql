-- ════════════════════════════════════════════════════════════════
-- Migration V006: Supplier Invoice Parse Result Table
-- Datum: 2026-07-24
-- ════════════════════════════════════════════════════════════════
-- ZWECK:
--   Erstellt die Tabelle für OCR/PDFBox-Extraktionsergebnisse.
--   Speichert Rohtext, erkannte Felder (JSON), Status und Metadaten.
--   Kein Feldparser in Phase 2B - nur OCR-Infrastruktur.
--
-- SICHERHEIT:
--   - Idempotent (IF NOT EXISTS)
--   - Foreign Key mit ON DELETE CASCADE (Dokument löschen → Parse-Result löschen)
--   - Indizes für store_id, document_id, status (Performance)
--   - CHECK Constraints für Status-Enum
--   - Keine bestehenden Tabellen geändert
--
-- MIGRATION NOTIZEN:
--   - Hibernate ddl-auto: update würde diese Tabelle automatisch erstellen
--   - Diese Migration ist für zukünftige Flyway-Aktivierung vorbereitet
--   - Kann manuell ausgeführt werden vor Deployment
--
-- ════════════════════════════════════════════════════════════════

-- Tabelle erstellen (idempotent)
CREATE TABLE IF NOT EXISTS supplier_invoice_parse_result (
    id BIGSERIAL PRIMARY KEY,
    
    -- Verknüpfung zum Original-Dokument (1:1, unique)
    document_id BIGINT NOT NULL UNIQUE,
    
    -- Store-ID für Cross-Store-Zugriffsprüfung
    store_id BIGINT NOT NULL,
    
    -- Verwendete Extraktionsmethode
    extraction_method VARCHAR(50) NOT NULL DEFAULT 'PDFBOX',
    
    -- Parser-Version für spätere Upgrades
    parser_version VARCHAR(20) NOT NULL DEFAULT '1.0.0',
    
    -- Erkannter Dokumenttyp
    document_type VARCHAR(50),
    
    -- Status der Verarbeitung
    parse_status VARCHAR(50) NOT NULL DEFAULT 'NOT_STARTED',
    
    -- Extrahierter Rohtext (vollständig)
    raw_text TEXT,
    
    -- Text pro Seite (JSON-Array von Strings)
    text_per_page_json TEXT,
    
    -- Erkannte strukturierte Daten (JSON)
    structured_data_json TEXT,
    
    -- Konfidenzwerte für erkannte Felder (JSON)
    confidence_scores_json TEXT,
    
    -- Zeitstempel
    extracted_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Key zum Dokument (CASCADE DELETE)
    CONSTRAINT fk_supplier_invoice_parse_result_document
        FOREIGN KEY (document_id)
        REFERENCES supplier_invoice_document(id)
        ON DELETE CASCADE,
    
    -- CHECK Constraints für Enums
    CONSTRAINT chk_parse_status CHECK (
        parse_status IN (
            'NOT_STARTED',
            'EXTRACTING',
            'TEXT_EXTRACTED',
            'OCR_REQUIRED',
            'OCR_RUNNING',
            'OCR_COMPLETED',
            'OCR_FAILED',
            'PARSING',
            'COMPLETED',
            'FAILED'
        )
    ),
    
    CONSTRAINT chk_document_type CHECK (
        document_type IN (
            'TEXT_PDF',
            'SCANNED_PDF',
            'IMAGE',
            'UNKNOWN'
        )
    ),
    
    CONSTRAINT chk_extraction_method CHECK (
        extraction_method IN (
            'PDFBOX',
            'TESSERACT'
        )
    )
);

-- Indizes für Performance
CREATE INDEX IF NOT EXISTS idx_supplier_invoice_parse_result_store_id 
    ON supplier_invoice_parse_result(store_id);

CREATE INDEX IF NOT EXISTS idx_supplier_invoice_parse_result_document_id 
    ON supplier_invoice_parse_result(document_id);

CREATE INDEX IF NOT EXISTS idx_supplier_invoice_parse_result_status 
    ON supplier_invoice_parse_result(parse_status);

CREATE INDEX IF NOT EXISTS idx_supplier_invoice_parse_result_created_at 
    ON supplier_invoice_parse_result(created_at DESC);

-- Kommentar für Doku
COMMENT ON TABLE supplier_invoice_parse_result IS 
    'Speichert OCR/PDFBox-Extraktionsergebnisse für Lieferantenrechnungen. Phase 2B: Nur OCR-Infrastruktur, kein Feldparser.';

COMMENT ON COLUMN supplier_invoice_parse_result.extraction_method IS 
    'PDFBOX für TEXT_PDF, TESSERACT für SCANNED_PDF/IMAGE';

COMMENT ON COLUMN supplier_invoice_parse_result.structured_data_json IS 
    'JSON-Format: {"invoiceNumber":"2026/00442", "invoiceDate":"2026-05-08", "totalAmount":1693.81, ...}';

COMMENT ON COLUMN supplier_invoice_parse_result.confidence_scores_json IS 
    'JSON-Format: {"invoiceNumber":0.95, "invoiceDate":0.88, ...} - für zukünftigen Feldparser';
