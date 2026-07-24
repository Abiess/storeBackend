-- V007: Erweiterung supplier_invoice_parse_result für Cache-System
-- Neue Felder für Checksummen, strukturierte Rechnungsfelder und Confidence

-- Checksumme des Dokuments (SHA-256) für Cache-Invalidierung
ALTER TABLE supplier_invoice_parse_result
ADD COLUMN IF NOT EXISTS document_checksum VARCHAR(64);

-- Strukturierte Rechnungsfelder (anstatt generisches JSON)
ALTER TABLE supplier_invoice_parse_result
ADD COLUMN IF NOT EXISTS supplier_name VARCHAR(500),
ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS customer_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS invoice_date DATE,
ADD COLUMN IF NOT EXISTS delivery_date DATE,
ADD COLUMN IF NOT EXISTS net_amount NUMERIC(19, 2),
ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(19, 2),
ADD COLUMN IF NOT EXISTS gross_amount NUMERIC(19, 2),
ADD COLUMN IF NOT EXISTS currency VARCHAR(3);

-- Confidence-Werte als JSONB für effiziente Queries
ALTER TABLE supplier_invoice_parse_result
ADD COLUMN IF NOT EXISTS confidence_json JSONB;

-- Warnungen als JSONB
ALTER TABLE supplier_invoice_parse_result
ADD COLUMN IF NOT EXISTS warnings_json JSONB;

-- Zeitpunkt des Parsings (für Cache-Alter)
ALTER TABLE supplier_invoice_parse_result
ADD COLUMN IF NOT EXISTS parsed_at TIMESTAMP;

-- Index auf document_checksum für schnelle Cache-Lookups
CREATE INDEX IF NOT EXISTS idx_parse_result_checksum
ON supplier_invoice_parse_result(document_checksum);

-- Index auf store_id + parse_status für Store-weite Status-Queries
CREATE INDEX IF NOT EXISTS idx_parse_result_store_status
ON supplier_invoice_parse_result(store_id, parse_status);

-- Kommentar aktualisieren
COMMENT ON TABLE supplier_invoice_parse_result IS 'Cache für geparste Rechnungsdaten mit OCR/PDFBox-Extraktion und lokaler Feldanalyse';
COMMENT ON COLUMN supplier_invoice_parse_result.document_checksum IS 'SHA-256 Checksumme des Dokuments für Cache-Invalidierung';
COMMENT ON COLUMN supplier_invoice_parse_result.parser_version IS 'Parser-Version (z.B. invoice-parser-v1) für Upgrade-Erkennung';
COMMENT ON COLUMN supplier_invoice_parse_result.confidence_json IS 'Confidence-Werte pro Feld (0.0-1.0)';
COMMENT ON COLUMN supplier_invoice_parse_result.warnings_json IS 'Array von Warnungen/Hinweisen aus der Analyse';
