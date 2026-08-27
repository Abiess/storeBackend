-- V016: Add failure_reason column to dhl_activity_log for detailed error auditing
-- Phase 3A.3 - Checkpoint 2/4

ALTER TABLE dhl_activity_log
ADD COLUMN failure_reason VARCHAR(50) NULL;

-- Index für Fehleranalyse
CREATE INDEX idx_dhl_activity_log_failure_reason 
ON dhl_activity_log(failure_reason) 
WHERE failure_reason IS NOT NULL;
