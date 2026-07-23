-- ════════════════════════════════════════════════════════════════
-- Migration V005: Legal Text Status Fields
-- Datum: 2026-07-23
-- ════════════════════════════════════════════════════════════════
-- ZWECK:
--   Fügt Status-Felder für Rechtstexte hinzu (NOT_CONFIGURED/DRAFT/PUBLISHED).
--   Ermöglicht Draft-System: Owner können Texte als Entwurf speichern,
--   bevor sie öffentlich veröffentlicht werden.
--
-- SICHERHEIT:
--   - Idempotent (IF NOT EXISTS)
--   - CHECK Constraints für erlaubte Status-Werte
--   - NOT NULL mit sinnvollem DEFAULT
--   - Consent-Flag für rechtliche Verantwortungsbestätigung
-- ════════════════════════════════════════════════════════════════

-- ─── Status-Felder für Rechtstexte ─────────────────────────────

-- AGB Status
ALTER TABLE stores
    ADD COLUMN IF NOT EXISTS terms_and_conditions_status VARCHAR(20)
        NOT NULL DEFAULT 'NOT_CONFIGURED';

-- Datenschutz Status
ALTER TABLE stores
    ADD COLUMN IF NOT EXISTS privacy_policy_status VARCHAR(20)
        NOT NULL DEFAULT 'NOT_CONFIGURED';

-- Rückgabebedingungen Status
ALTER TABLE stores
    ADD COLUMN IF NOT EXISTS return_policy_status VARCHAR(20)
        NOT NULL DEFAULT 'NOT_CONFIGURED';

-- Versandbedingungen Status
ALTER TABLE stores
    ADD COLUMN IF NOT EXISTS shipping_policy_status VARCHAR(20)
        NOT NULL DEFAULT 'NOT_CONFIGURED';

-- ─── Consent-Flag für rechtliche Verantwortungsbestätigung ──────

-- Flag: Wurde rechtliche Verantwortung bestätigt?
ALTER TABLE stores
    ADD COLUMN IF NOT EXISTS legal_responsibility_accepted BOOLEAN
        NOT NULL DEFAULT FALSE;

-- ─── CHECK Constraints für Status-Validierung ───────────────────

-- Constraint für AGB Status (nur wenn Spalte neu erstellt wurde)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'chk_terms_status' AND conrelid = 'stores'::regclass
    ) THEN
        ALTER TABLE stores
            ADD CONSTRAINT chk_terms_status
            CHECK (terms_and_conditions_status IN ('NOT_CONFIGURED', 'DRAFT', 'PUBLISHED'));
    END IF;
END $$;

-- Constraint für Datenschutz Status
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'chk_privacy_status' AND conrelid = 'stores'::regclass
    ) THEN
        ALTER TABLE stores
            ADD CONSTRAINT chk_privacy_status
            CHECK (privacy_policy_status IN ('NOT_CONFIGURED', 'DRAFT', 'PUBLISHED'));
    END IF;
END $$;

-- Constraint für Rückgabebedingungen Status
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'chk_return_status' AND conrelid = 'stores'::regclass
    ) THEN
        ALTER TABLE stores
            ADD CONSTRAINT chk_return_status
            CHECK (return_policy_status IN ('NOT_CONFIGURED', 'DRAFT', 'PUBLISHED'));
    END IF;
END $$;

-- Constraint für Versandbedingungen Status
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'chk_shipping_status' AND conrelid = 'stores'::regclass
    ) THEN
        ALTER TABLE stores
            ADD CONSTRAINT chk_shipping_status
            CHECK (shipping_policy_status IN ('NOT_CONFIGURED', 'DRAFT', 'PUBLISHED'));
    END IF;
END $$;

-- ─── Indizes für Performance ─────────────────────────────────────

-- Schnelle Suche nach veröffentlichten Stores (Public API)
CREATE INDEX IF NOT EXISTS idx_stores_terms_published 
    ON stores(terms_and_conditions_status) 
    WHERE terms_and_conditions_status = 'PUBLISHED';

CREATE INDEX IF NOT EXISTS idx_stores_privacy_published 
    ON stores(privacy_policy_status) 
    WHERE privacy_policy_status = 'PUBLISHED';

-- ─── Kommentare für Dokumentation ─────────────────────────────────

COMMENT ON COLUMN stores.terms_and_conditions_status IS 
    'Status der AGB: NOT_CONFIGURED (leer), DRAFT (Entwurf), PUBLISHED (veröffentlicht)';

COMMENT ON COLUMN stores.privacy_policy_status IS 
    'Status der Datenschutzerklärung: NOT_CONFIGURED, DRAFT, PUBLISHED';

COMMENT ON COLUMN stores.return_policy_status IS 
    'Status der Rückgabebedingungen: NOT_CONFIGURED, DRAFT, PUBLISHED';

COMMENT ON COLUMN stores.shipping_policy_status IS 
    'Status der Versandbedingungen: NOT_CONFIGURED, DRAFT, PUBLISHED';

COMMENT ON COLUMN stores.legal_responsibility_accepted IS 
    'Hat Store-Owner rechtliche Verantwortung für Inhalte bestätigt?';

-- ════════════════════════════════════════════════════════════════
-- Migration abgeschlossen
-- ════════════════════════════════════════════════════════════════
