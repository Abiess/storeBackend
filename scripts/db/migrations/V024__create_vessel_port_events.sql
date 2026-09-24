-- ════════════════════════════════════════════════════════════════
-- Migration V024: Vessel Port Events (Maritime Phase 2B)
-- ════════════════════════════════════════════════════════════════
-- ZWECK:
--   Kleine, fachliche Historie von Statuswechseln pro Schiff für das
--   Maritime-Feature (Port Events + Liegezeiten). Es wird bewusst NICHT
--   jede AIS-Nachricht/Position persistiert (siehe VesselDTO/AisStreamClientService,
--   die weiterhin nur den Live-Cache ohne Historie halten) - nur ein
--   Eintrag pro echtem VesselPortStatus-Wechsel (siehe
--   storebackend.service.VesselPortEventService#recordTransitionIfAny).
--
--   Global, kein Store-/Multi-Tenant-Bezug (analog zum restlichen
--   Maritime-Feature, das nicht store-spezifisch ist).
--
-- TABELLE: vessel_port_events
--   id            BIGSERIAL PRIMARY KEY
--   mmsi          BIGINT NOT NULL (Schiffs-ID, siehe VesselDTO.mmsi)
--   port          VARCHAR(30) NOT NULL (MaritimePort-Enum-Name, z.B. TANGER_MED)
--   event_type    VARCHAR(20) NOT NULL, CHECK IN
--                 (APPROACHING, ENTERED_PORT, MOORED, DEPARTING, LEFT_PORT)
--   event_time    TIMESTAMP NOT NULL (Zeitpunkt des Statuswechsels)
--   latitude      DOUBLE PRECISION NULL
--   longitude     DOUBLE PRECISION NULL
--   sog           DOUBLE PRECISION NULL (Speed Over Ground, Knoten)
--   ship_name     VARCHAR(100) NULL
--   destination   VARCHAR(150) NULL
--   created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
--
-- INDIZES (siehe Aufgabenstellung "Performance"):
--   - (mmsi, event_time DESC)       -> Vessel-Detail-Historie
--   - (port, event_time DESC)       -> "Letzte Hafenereignisse" je Hafen
--   - (mmsi, port, event_type)      -> künftige Auswertungen/Dedup-Checks
--
-- HINWEIS ZUM MIGRATIONSPFAD (siehe V021/V022/V023):
--   Das produktive Deployment (scripts/deploy.sh) führt ausschließlich
--   SQL-Dateien aus scripts/db/migrations/ aus (alphabetisch sortiert,
--   via `sudo -u postgres psql -f`). Flyway ist projektweit deaktiviert;
--   diese Datei ist die einzige aktive Migration für vessel_port_events.
--   Analog zu V023 (customer_credit_accounts/credit_transactions) wird
--   die Tabelle NICHT zusätzlich in scripts/db/schema.sql gespiegelt.
-- ════════════════════════════════════════════════════════════════

BEGIN;

CREATE TABLE IF NOT EXISTS vessel_port_events (
    id BIGSERIAL PRIMARY KEY,
    mmsi BIGINT NOT NULL,
    port VARCHAR(30) NOT NULL,
    event_type VARCHAR(20) NOT NULL,
    event_time TIMESTAMP NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    sog DOUBLE PRECISION,
    ship_name VARCHAR(100),
    destination VARCHAR(150),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT ck_vessel_port_event_type
        CHECK (event_type IN ('APPROACHING', 'ENTERED_PORT', 'MOORED', 'DEPARTING', 'LEFT_PORT'))
);

CREATE INDEX IF NOT EXISTS idx_vessel_port_events_mmsi_time
    ON vessel_port_events(mmsi, event_time DESC);

CREATE INDEX IF NOT EXISTS idx_vessel_port_events_port_time
    ON vessel_port_events(port, event_time DESC);

CREATE INDEX IF NOT EXISTS idx_vessel_port_events_mmsi_port_type
    ON vessel_port_events(mmsi, port, event_type);

COMMENT ON TABLE vessel_port_events IS
    'Maritime Phase 2B: fachliche Statuswechsel-Historie pro Schiff (Port Events + Liegezeiten). Kein AIS-Rohdaten-/Positions-Log - nur ein Eintrag pro echtem VesselPortStatus-Wechsel.';
COMMENT ON COLUMN vessel_port_events.mmsi IS
    'Schiffs-ID (MMSI), identisch zu VesselDTO.mmsi im In-Memory-Cache.';
COMMENT ON COLUMN vessel_port_events.port IS
    'MaritimePort-Enum-Name (TANGER_MED, NADOR, CASABLANCA) - der zum Event-Zeitpunkt aktiv ausgewählte Hafen.';
COMMENT ON COLUMN vessel_port_events.event_type IS
    'APPROACHING, ENTERED_PORT, MOORED, DEPARTING oder LEFT_PORT - siehe storebackend.enums.PortEventType.';

-- ─── Validierung ──────────────────────────────────────────────────

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'vessel_port_events'
    ) THEN
        RAISE EXCEPTION 'Migration V024 fehlgeschlagen: vessel_port_events wurde nicht angelegt';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'idx_vessel_port_events_mmsi_time'
    ) THEN
        RAISE EXCEPTION 'Migration V024 fehlgeschlagen: idx_vessel_port_events_mmsi_time fehlt';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'idx_vessel_port_events_port_time'
    ) THEN
        RAISE EXCEPTION 'Migration V024 fehlgeschlagen: idx_vessel_port_events_port_time fehlt';
    END IF;

    RAISE NOTICE 'Migration V024 validation successful ✅ - vessel_port_events angelegt, inkl. CHECK-Constraint und Indizes';
END $$;

COMMIT;

-- ════════════════════════════════════════════════════════════════
-- Migration abgeschlossen
-- ════════════════════════════════════════════════════════════════
