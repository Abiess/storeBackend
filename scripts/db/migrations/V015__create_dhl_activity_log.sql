-- V015: DHL Activity Log
-- Phase 3A.2 - Multi-Tenant-sicheres Audit-Log für DHL-Paket-Aktionen

CREATE TABLE dhl_activity_log (
    id BIGSERIAL PRIMARY KEY,
    store_id BIGINT NOT NULL,
    parcel_id BIGINT,
    tracking_code VARCHAR(50) NOT NULL,
    action VARCHAR(20) NOT NULL,
    slot_snapshot VARCHAR(100),
    user_id BIGINT NOT NULL,
    user_email VARCHAR(255) NOT NULL,
    duration_ms BIGINT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_dhl_activity_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
    CONSTRAINT fk_dhl_activity_parcel FOREIGN KEY (parcel_id) REFERENCES dhl_parcels(id) ON DELETE SET NULL,
    CONSTRAINT fk_dhl_activity_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT ck_dhl_activity_action CHECK (action IN ('STORED', 'FOUND', 'PICKED_UP', 'SCAN_FAILED', 'MANUAL_SEARCH'))
);

-- Indices für Multi-Tenant Queries (WICHTIG für Performance)
CREATE INDEX idx_dhl_activity_store ON dhl_activity_log(store_id);
CREATE INDEX idx_dhl_activity_store_created ON dhl_activity_log(store_id, created_at DESC);
CREATE INDEX idx_dhl_activity_action ON dhl_activity_log(store_id, action);
CREATE INDEX idx_dhl_activity_user ON dhl_activity_log(store_id, user_id);

-- Composite Index für gefilterte Dashboard-Abfragen
CREATE INDEX idx_dhl_activity_filters ON dhl_activity_log(store_id, action, user_id, created_at DESC);

-- Optional: Index auf tracking_code für Lookup
CREATE INDEX idx_dhl_activity_tracking ON dhl_activity_log(tracking_code);

-- COMMENT für Dokumentation
COMMENT ON TABLE dhl_activity_log IS 'Phase 3A.2: Audit-Log für alle DHL-Paket-Aktionen. Multi-Tenant-sicher via store_id. User-Identität aus Spring Security Context.';
COMMENT ON COLUMN dhl_activity_log.store_id IS 'Multi-Tenant: Store ID - MUSS in allen Queries verwendet werden';
COMMENT ON COLUMN dhl_activity_log.parcel_id IS 'Optional: Referenz auf dhl_parcels, kann NULL sein bei SCAN_FAILED/MANUAL_SEARCH';
COMMENT ON COLUMN dhl_activity_log.tracking_code IS 'Normalisierter Tracking-Code (uppercase, keine Leerzeichen)';
COMMENT ON COLUMN dhl_activity_log.action IS 'STORED, FOUND, PICKED_UP, SCAN_FAILED, MANUAL_SEARCH';
COMMENT ON COLUMN dhl_activity_log.slot_snapshot IS 'Lagerplatz-Snapshot zum Zeitpunkt der Aktion';
COMMENT ON COLUMN dhl_activity_log.user_id IS 'User ID aus Spring Security Context (NIE vom Frontend!)';
COMMENT ON COLUMN dhl_activity_log.user_email IS 'E-Mail-Snapshot für Anzeige (falls User gelöscht wird)';
COMMENT ON COLUMN dhl_activity_log.duration_ms IS 'Bearbeitungsdauer in Millisekunden (optional)';
