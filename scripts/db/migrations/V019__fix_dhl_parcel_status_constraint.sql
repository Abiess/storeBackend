-- ============================================================================
-- DHL - dhl_parcels.status CHECK Constraint erweitern (CANCELLED fehlt)
-- ============================================================================
--
-- HINTERGRUND:
--
-- Die Tabelle dhl_parcels wurde ursprünglich VOR Einführung dieses
-- SQL-Migrationssystems angelegt (ddl-auto: update). Dabei entstand ein
-- CHECK Constraint "dhl_parcels_status_check", der nur die damaligen
-- DhlParcelStatus-Werte erlaubte:
--
--   CHECK (status IN ('STORED', 'PICKED_UP'))
--
-- V017 (dhl_parcel_cancellation_and_partial_unique) hat den Status
-- CANCELLED fachlich eingeführt (Phase 3A.4, Paket-Korrektur/Stornierung)
-- und dafür Cancel-Metadaten-Spalten sowie einen Partial Unique Index
-- ergänzt - hat den bestehenden status-CHECK-Constraint selbst aber
-- NICHT angefasst (siehe V017, Abschnitt 1-3: nur ADD COLUMN + Index,
-- keine ALTER TABLE ... ADD/DROP CONSTRAINT auf status).
--
-- Aktueller Production-Stand (bestätigt):
--   dhl_parcels_status_check: CHECK (status IN ('STORED', 'PICKED_UP'))
--
-- Java-Enum DhlParcelStatus (aktuell):
--   STORED, PICKED_UP, CANCELLED
--
-- => Ohne diese Migration schlägt jedes Speichern von status='CANCELLED'
--    (DhlParcelService.cancelStorage() / resetWarehouse()) mit einem
--    CHECK-Constraint-Verstoß auf DB-Ebene fehl.
--
-- cancellation_reason (dhl_parcels, dhl_activity_log):
--   V017 hat diese Spalten als VARCHAR(50) OHNE eigenen CHECK Constraint
--   angelegt (nur Kommentar mit den zulässigen Enum-Werten). Es existiert
--   somit AKTUELL kein DB-Constraint, der MANUAL_REMOVAL oder
--   WAREHOUSE_RESET blockieren würde - beide Werte aus CancellationReason
--   können bereits ohne Schemaänderung gespeichert werden. Diese Migration
--   fasst cancellation_reason daher bewusst NICHT an (kein Constraint
--   vorhanden, der erweitert werden müsste).
--
-- DIESE MIGRATION:
-- 1. Ersetzt NUR dhl_parcels_status_check durch die vollständige,
--    aktuelle DhlParcelStatus-Liste (STORED, PICKED_UP, CANCELLED).
-- 2. Verändert/löscht KEINE bestehenden Daten.
-- 3. Fasst KEINE andere Migration (insb. V017, V018) an.
-- 4. Ist idempotent für wiederholte Deployment-Läufe (siehe unten).
-- ============================================================================

-- ============================================================================
-- 1. Veralteten status-Constraint erkennen und (falls nötig) entfernen
-- ============================================================================
--
-- Idempotenz-Strategie:
-- - Constraint-Definition wird per pg_get_constraintdef() gelesen.
-- - Enthält sie bereits 'CANCELLED', ist nichts zu tun (bereits migriert,
--   z.B. bei erneutem Deploy-Lauf).
-- - Fehlt 'CANCELLED', wird der alte (veraltete) Constraint gedroppt,
--   damit Schritt 2 den korrekten Constraint anlegen kann.
-- - Existiert der Constraint gar nicht (z.B. abweichende Testumgebung),
--   wird direkt zu Schritt 2 übergegangen.

DO $$
DECLARE
    v_condef text;
BEGIN
    SELECT pg_get_constraintdef(oid) INTO v_condef
    FROM pg_constraint
    WHERE conrelid = 'dhl_parcels'::regclass
      AND contype = 'c'
      AND conname = 'dhl_parcels_status_check';

    IF v_condef IS NULL THEN
        RAISE NOTICE 'Constraint dhl_parcels_status_check existiert nicht - wird in Schritt 2 neu angelegt';
    ELSIF v_condef ILIKE '%CANCELLED%' THEN
        RAISE NOTICE 'Constraint dhl_parcels_status_check enthält CANCELLED bereits - kein Drop nötig (idempotenter Re-Run)';
    ELSE
        ALTER TABLE dhl_parcels DROP CONSTRAINT dhl_parcels_status_check;
        RAISE NOTICE 'Veralteten Constraint dhl_parcels_status_check gedroppt (war: %)', v_condef;
    END IF;
END $$;

-- ============================================================================
-- 2. Neuen status-Constraint mit vollständiger Enum-Liste anlegen
-- ============================================================================
--
-- WICHTIG: bestehende Zeilen sind NICHT betroffen - alle heutigen Werte
-- (STORED, PICKED_UP) sind weiterhin gültig, CANCELLED kommt zusätzlich hinzu.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'dhl_parcels'::regclass
          AND contype = 'c'
          AND conname = 'dhl_parcels_status_check'
    ) THEN
        ALTER TABLE dhl_parcels
            ADD CONSTRAINT dhl_parcels_status_check
            CHECK (status IN ('STORED', 'PICKED_UP', 'CANCELLED'));

        RAISE NOTICE 'Constraint dhl_parcels_status_check angelegt: STORED, PICKED_UP, CANCELLED';
    ELSE
        RAISE NOTICE 'Constraint dhl_parcels_status_check existiert bereits mit korrekter Definition - übersprungen';
    END IF;
END $$;

-- ============================================================================
-- 3. Validierung
-- ============================================================================

DO $$
DECLARE
    v_condef text;
BEGIN
    SELECT pg_get_constraintdef(oid) INTO v_condef
    FROM pg_constraint
    WHERE conrelid = 'dhl_parcels'::regclass
      AND contype = 'c'
      AND conname = 'dhl_parcels_status_check';

    IF v_condef IS NULL THEN
        RAISE EXCEPTION 'Migration V019 fehlgeschlagen: dhl_parcels_status_check wurde nicht angelegt';
    END IF;

    IF v_condef NOT ILIKE '%CANCELLED%' THEN
        RAISE EXCEPTION 'Migration V019 fehlgeschlagen: dhl_parcels_status_check enthält CANCELLED nicht (aktuell: %)', v_condef;
    END IF;

    RAISE NOTICE 'Migration V019 validation successful ✅ (dhl_parcels_status_check = %)', v_condef;
END $$;
