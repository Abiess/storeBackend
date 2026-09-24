-- ============================================================================
-- DHL Parcel Tracking-Metadaten (aus DhlTrackingClient.validateTrackingCode())
-- ============================================================================
--
-- ÄNDERUNGEN:
-- dhl_parcels: 10 neue, ausnahmslos NULLABLE Spalten für DHL-Tracking-Metadaten,
-- die ausschließlich serverseitig aus der authoritativen DHL-Tracking-Response
-- übernommen werden (DhlController.storeParcel() -> DhlTrackingClient), niemals
-- aus Client-Eingaben.
--
-- NEUE SPALTEN (entspricht 1:1 den neuen Feldern in entity/DhlParcel.java):
--   piece_identifier     VARCHAR(50)
--   shipment_status      VARCHAR(255)
--   standard_event_code  VARCHAR(20)
--   product_code         VARCHAR(20)
--   product_name         VARCHAR(255)
--   weight_kg            NUMERIC(10,3)
--   destination_country  VARCHAR(10)
--   origin_country       VARCHAR(10)
--   last_event_timestamp VARCHAR(50)   -- roher DHL-Wert, siehe Hinweis unten
--   pslz_number          VARCHAR(50)
--
-- Alle Spalten NULLABLE:
-- - ältere Pakete (vor dieser Erweiterung) haben keine Metadaten
-- - nicht jede DHL-Response enthält jedes Feld
--
-- Bestehende Daten werden NICHT verändert oder gelöscht (nur additive
-- ALTER TABLE ... ADD COLUMN IF NOT EXISTS).
--
-- HINWEIS last_event_timestamp:
-- Wird bewusst als VARCHAR und nicht als TIMESTAMP gespeichert, da DHL das
-- Feld "last-event-timestamp" in der Tracking-Response als unstrukturierten
-- String liefert, dessen Format nicht verlässlich/einheitlich zugesichert ist.
-- Der Rohwert wird unverändert durchgereicht (kein Parsing-Risiko/Datenverlust
-- bei abweichendem Format). Keine Änderung im Rahmen dieser Migration.
-- ============================================================================

BEGIN;

ALTER TABLE dhl_parcels
    ADD COLUMN IF NOT EXISTS piece_identifier     VARCHAR(50),
    ADD COLUMN IF NOT EXISTS shipment_status       VARCHAR(255),
    ADD COLUMN IF NOT EXISTS standard_event_code   VARCHAR(20),
    ADD COLUMN IF NOT EXISTS product_code          VARCHAR(20),
    ADD COLUMN IF NOT EXISTS product_name          VARCHAR(255),
    ADD COLUMN IF NOT EXISTS weight_kg             NUMERIC(10,3),
    ADD COLUMN IF NOT EXISTS destination_country   VARCHAR(10),
    ADD COLUMN IF NOT EXISTS origin_country        VARCHAR(10),
    ADD COLUMN IF NOT EXISTS last_event_timestamp  VARCHAR(50),
    ADD COLUMN IF NOT EXISTS pslz_number           VARCHAR(50);

COMMENT ON COLUMN dhl_parcels.piece_identifier IS 'DHL Piece Identifier (ohne führende Nullen)';
COMMENT ON COLUMN dhl_parcels.shipment_status IS 'Sendungsstatus im Klartext aus DHL-Tracking-Response';
COMMENT ON COLUMN dhl_parcels.standard_event_code IS 'DHL Standard Event Code (z.B. "ZF")';
COMMENT ON COLUMN dhl_parcels.product_code IS 'DHL Produktcode (z.B. "P")';
COMMENT ON COLUMN dhl_parcels.product_name IS 'DHL Produktname (z.B. "DHL PAKET, Filial-Routing, GoGreen Plus")';
COMMENT ON COLUMN dhl_parcels.weight_kg IS 'Gewicht in kg laut DHL-Tracking-Response';
COMMENT ON COLUMN dhl_parcels.destination_country IS 'Zielland der Sendung (ISO-Code, z.B. "DE")';
COMMENT ON COLUMN dhl_parcels.origin_country IS 'Ursprungsland der Sendung (ISO-Code, z.B. "DE")';
COMMENT ON COLUMN dhl_parcels.last_event_timestamp IS 'Zeitpunkt des letzten DHL-Ereignisses, roher DHL-Wert (String, Format nicht garantiert)';
COMMENT ON COLUMN dhl_parcels.pslz_number IS 'PSLZ-Nummer (Post-Sortier-Leitzahl, DHL-internes Feld)';

-- ============================================================================
-- Validierung
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'dhl_parcels' AND column_name = 'piece_identifier'
    ) THEN
        RAISE EXCEPTION 'Migration failed: dhl_parcels.piece_identifier not created';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'dhl_parcels' AND column_name = 'last_event_timestamp'
    ) THEN
        RAISE EXCEPTION 'Migration failed: dhl_parcels.last_event_timestamp not created';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'dhl_parcels' AND column_name = 'pslz_number'
    ) THEN
        RAISE EXCEPTION 'Migration failed: dhl_parcels.pslz_number not created';
    END IF;

    RAISE NOTICE 'Migration V018 validation successful ✅ (10 neue nullable Spalten auf dhl_parcels)';
END $$;

COMMIT;
