-- V016: Add failure_reason column to dhl_activity_log for detailed error auditing
-- Phase 3A.3 - Checkpoint 2/4
--
-- IDEMPOTENT: Prüft ob Spalte bereits existiert

-- Spalte nur hinzufügen falls nicht vorhanden
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'dhl_activity_log' 
        AND column_name = 'failure_reason'
    ) THEN
        ALTER TABLE dhl_activity_log
        ADD COLUMN failure_reason VARCHAR(50) NULL;
        
        RAISE NOTICE 'Column failure_reason added to dhl_activity_log';
    ELSE
        RAISE NOTICE 'Column failure_reason already exists in dhl_activity_log - skipping';
    END IF;
END $$;

-- Index für Fehleranalyse (nur falls Spalte existiert)
CREATE INDEX IF NOT EXISTS idx_dhl_activity_log_failure_reason 
ON dhl_activity_log(failure_reason) 
WHERE failure_reason IS NOT NULL;
