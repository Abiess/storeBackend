-- ============================================================================
-- DHL Phase 3A.4 - Paket-Korrektur / Stornierung
-- ============================================================================
-- 
-- ÄNDERUNGEN:
-- 1. DhlParcel: Cancel-Metadaten
-- 2. DhlActivityLog: cancellation_reason + cancellation_note
-- 3. Partial Unique Constraint für Tracking-Code Wiederverwendung
--
-- TRACKING-CODE WIEDERVERWENDUNG:
-- 
-- ALTER:
--   UNIQUE (store_id, tracking_code) → verhindert Wiederverwendung
-- 
-- NEU:
--   Partial Unique Index → nur aktive Parcels (STORED, PICKED_UP)
--   CANCELLED Parcels blockieren nicht mehr
-- 
-- Beispiel:
--   trackingCode X → STORED   → Unique Constraint aktiv
--   trackingCode X → CANCELLED → Unique Constraint inaktiv
--   trackingCode X → STORED   → wieder möglich
-- ============================================================================

-- ============================================================================
-- 1. DhlParcel: Cancel-Metadaten hinzufügen
-- ============================================================================

ALTER TABLE dhl_parcels
    ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS cancellation_reason VARCHAR(50),
    ADD COLUMN IF NOT EXISTS cancellation_note VARCHAR(500),
    ADD COLUMN IF NOT EXISTS cancelled_by_user_id BIGINT,
    ADD COLUMN IF NOT EXISTS cancelled_by_email VARCHAR(255);

COMMENT ON COLUMN dhl_parcels.cancelled_at IS 'Zeitpunkt der Stornierung (Phase 3A.4)';
COMMENT ON COLUMN dhl_parcels.cancellation_reason IS 'Enum CancellationReason: WRONG_SCAN, WRONG_PARCEL, TEST_SCAN, DUPLICATE_ENTRY, OTHER';
COMMENT ON COLUMN dhl_parcels.cancellation_note IS 'Optionale Freitext-Begründung';
COMMENT ON COLUMN dhl_parcels.cancelled_by_user_id IS 'User ID des Mitarbeiters, der storniert hat';
COMMENT ON COLUMN dhl_parcels.cancelled_by_email IS 'E-Mail-Snapshot des Mitarbeiters';

-- ============================================================================
-- 2. DhlActivityLog: cancellation_reason + cancellation_note
-- ============================================================================

ALTER TABLE dhl_activity_log
    ADD COLUMN IF NOT EXISTS cancellation_reason VARCHAR(50),
    ADD COLUMN IF NOT EXISTS cancellation_note VARCHAR(500);

COMMENT ON COLUMN dhl_activity_log.cancellation_reason IS 'Stornierungsgrund bei action=STORAGE_CANCELLED (Phase 3A.4)';
COMMENT ON COLUMN dhl_activity_log.cancellation_note IS 'Optionale Notiz bei action=STORAGE_CANCELLED';

-- ============================================================================
-- 3. Tracking-Code Unique Constraint Migration
-- ============================================================================

-- 3.1. Prüfen, ob Constraint existiert
DO $$
BEGIN
    -- ALTER TABLE CONSTRAINT kann nicht IF EXISTS nutzen
    -- Workaround: Prüfe pg_constraint
    
    IF EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'dhl_parcels_store_id_tracking_code_key'
          AND conrelid = 'dhl_parcels'::regclass
    ) THEN
        -- 3.2. Alten Unique Constraint entfernen
        ALTER TABLE dhl_parcels 
            DROP CONSTRAINT dhl_parcels_store_id_tracking_code_key;
        
        RAISE NOTICE 'Dropped old unique constraint: dhl_parcels_store_id_tracking_code_key';
    ELSE
        RAISE NOTICE 'Constraint dhl_parcels_store_id_tracking_code_key does not exist, skipping drop';
    END IF;
END $$;

-- 3.3. Partial Unique Index erstellen (nur aktive Parcels)
--
-- WICHTIG:
-- - Nur STORED und PICKED_UP zählen als "aktiv"
-- - CANCELLED Parcels blockieren nicht mehr
--
-- Erlaubt:
--   store_id=121, tracking=X, status=STORED   → OK (aktiv)
--   store_id=121, tracking=X, status=CANCELLED → OK (inaktiv, wird nicht geprüft)
--   store_id=121, tracking=X, status=STORED   → OK (vorherige ist CANCELLED)
--
-- Blockiert:
--   store_id=121, tracking=X, status=STORED
--   store_id=121, tracking=X, status=STORED   → CONFLICT (zwei aktive)

CREATE UNIQUE INDEX IF NOT EXISTS idx_dhl_parcels_active_tracking 
    ON dhl_parcels (store_id, tracking_code)
    WHERE status IN ('STORED', 'PICKED_UP');

COMMENT ON INDEX idx_dhl_parcels_active_tracking IS 
    'Partial Unique Constraint: Tracking-Code nur für aktive Parcels (STORED, PICKED_UP) unique. CANCELLED Parcels erlauben Wiederverwendung.';

-- ============================================================================
-- 4. Validierung
-- ============================================================================

-- 4.1. Prüfe neue Spalten existieren
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'dhl_parcels' AND column_name = 'cancelled_at'
    ) THEN
        RAISE EXCEPTION 'Migration failed: dhl_parcels.cancelled_at not created';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'dhl_activity_log' AND column_name = 'cancellation_reason'
    ) THEN
        RAISE EXCEPTION 'Migration failed: dhl_activity_log.cancellation_reason not created';
    END IF;
    
    -- 4.2. Prüfe Partial Index existiert
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_dhl_parcels_active_tracking'
    ) THEN
        RAISE EXCEPTION 'Migration failed: idx_dhl_parcels_active_tracking not created';
    END IF;
    
    RAISE NOTICE 'Migration V017 validation successful ✅';
END $$;
