-- ════════════════════════════════════════════════════════════════
-- Migration: Legal/Impressum-Felder für markt.ma Multi-Tenant Stores
-- Version: V1__add_store_legal_fields.sql
-- Datum: 2025-01-XX
-- ════════════════════════════════════════════════════════════════
-- ZWECK:
--   Store-Betreiber müssen ihre eigenen rechtlichen Daten (Impressum,
--   Datenschutz, AGB) pflegen. Diese Migration trennt Store-Betreiber-
--   Verantwortung von markt.ma-Plattformrolle.
--
-- SICHERHEIT:
--   - Verwendet IF NOT EXISTS für Production-Kompatibilität
--   - Keine destructive Operationen
--   - Alle Felder nullable (Bestandsstores haben noch keine Legal-Daten)
-- ════════════════════════════════════════════════════════════════

-- ─── Legal/Impressum-Felder ─────────────────────────────────────

-- Offizieller Firmen-/Name (z.B. "Müller GmbH" oder "Max Mustermann")
ALTER TABLE stores ADD COLUMN IF NOT EXISTS legal_name VARCHAR(255);

-- Rechtsform (z.B. "GmbH", "UG", "Einzelunternehmen", "e.K.")
ALTER TABLE stores ADD COLUMN IF NOT EXISTS legal_form VARCHAR(100);

-- Vertretungsberechtigte Person (z.B. "Max Mustermann, Geschäftsführer")
ALTER TABLE stores ADD COLUMN IF NOT EXISTS authorized_representative VARCHAR(255);

-- Registergericht (z.B. "Amtsgericht Berlin-Charlottenburg")
ALTER TABLE stores ADD COLUMN IF NOT EXISTS commercial_register VARCHAR(255);

-- Registernummer (z.B. "HRB 123456 B")
ALTER TABLE stores ADD COLUMN IF NOT EXISTS register_number VARCHAR(100);

-- Umsatzsteuer-Identifikationsnummer (z.B. "DE123456789")
ALTER TABLE stores ADD COLUMN IF NOT EXISTS vat_id VARCHAR(50);

-- ─── Legal Responsibility Consent Tracking ──────────────────────

-- Zeitstempel: Wann Store-Owner rechtliche Verantwortung bestätigt hat
ALTER TABLE stores ADD COLUMN IF NOT EXISTS legal_responsibility_accepted_at TIMESTAMP;

-- User-ID: Wer Verantwortung bestätigt hat (FK zu User)
ALTER TABLE stores ADD COLUMN IF NOT EXISTS legal_responsibility_accepted_by_user_id BIGINT;

-- Consent-Version (z.B. "1.0", "2024-01") für Versionierung
ALTER TABLE stores ADD COLUMN IF NOT EXISTS legal_responsibility_version VARCHAR(20);

-- Validierung: Ist Impressum vollständig ausgefüllt?
-- DEFAULT FALSE für bestehende Stores (noch nicht ausgefüllt)
ALTER TABLE stores ADD COLUMN IF NOT EXISTS imprint_complete BOOLEAN NOT NULL DEFAULT FALSE;

-- ─── Indizes für Performance ─────────────────────────────────────

-- Schnelle Suche nach vollständigen Impressen
CREATE INDEX IF NOT EXISTS idx_stores_imprint_complete ON stores(imprint_complete);

-- Schnelle Suche nach USt-IdNr. (für steuerrechtliche Prüfungen)
CREATE INDEX IF NOT EXISTS idx_stores_vat_id ON stores(vat_id) WHERE vat_id IS NOT NULL;

-- ─── Kommentare für Dokumentation ─────────────────────────────────

COMMENT ON COLUMN stores.legal_name IS 'Offizieller Firmen-/Name des Store-Betreibers';
COMMENT ON COLUMN stores.legal_form IS 'Rechtsform (GmbH, UG, Einzelunternehmen, e.K., ...)';
COMMENT ON COLUMN stores.authorized_representative IS 'Vertretungsberechtigte Person(en)';
COMMENT ON COLUMN stores.commercial_register IS 'Registergericht (z.B. Amtsgericht Berlin-Charlottenburg)';
COMMENT ON COLUMN stores.register_number IS 'Registernummer (z.B. HRB 123456 B)';
COMMENT ON COLUMN stores.vat_id IS 'USt-IdNr. (z.B. DE123456789)';
COMMENT ON COLUMN stores.legal_responsibility_accepted_at IS 'Zeitstempel: Wann Store-Owner Verantwortung bestätigt hat';
COMMENT ON COLUMN stores.legal_responsibility_accepted_by_user_id IS 'User-ID: Wer Verantwortung bestätigt hat';
COMMENT ON COLUMN stores.legal_responsibility_version IS 'Consent-Version (z.B. "1.0")';
COMMENT ON COLUMN stores.imprint_complete IS 'Ist Impressum vollständig ausgefüllt? (für Admin-Warnung)';

-- ════════════════════════════════════════════════════════════════
-- Migration abgeschlossen
-- ════════════════════════════════════════════════════════════════
