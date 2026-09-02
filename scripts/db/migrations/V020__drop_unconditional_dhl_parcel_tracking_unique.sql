-- ============================================================================
-- DHL - dhl_parcels: unconditional UNIQUE(store_id, tracking_code) entfernen
-- ============================================================================
--
-- HINTERGRUND (Root Cause):
--
-- V017 (dhl_parcel_cancellation_and_partial_unique) hat den ursprünglichen
-- unconditional Unique Constraint auf (store_id, tracking_code) bewusst
-- gedroppt und durch einen PARTIAL Unique Index ersetzt:
--
--   idx_dhl_parcels_active_tracking
--     UNIQUE (store_id, tracking_code) WHERE status IN ('STORED','PICKED_UP')
--
-- Ziel: CANCELLED Pakete sollen den Tracking-Code für eine erneute
-- Einlagerung wieder freigeben (siehe DhlParcelStatus.CANCELLED Javadoc).
--
-- ABER: Die JPA-Entity DhlParcel.java trug bis zu diesem Fix weiterhin
--
--   @Table(uniqueConstraints = { @UniqueConstraint(columnNames =
--       {"store_id", "tracking_code"}) })
--
-- Da das Projekt zusätzlich mit ddl-auto: update betrieben wird, hat
-- Hibernate diesen (unconditional!) Constraint beim nächsten Schema-Abgleich
-- in Production automatisch wieder angelegt - unter einem neuen,
-- automatisch generierten Hash-Namen (z.B. "ukbygu9t4xjbde5vx1c3p1aqr89").
--
-- Ergebnis: Production hatte zwei parallele, widersprüchliche
-- Unique-Mechanismen auf (store_id, tracking_code):
--   - idx_dhl_parcels_active_tracking      (partial, korrekt, aus V017)
--   - uk<hash>                             (unconditional, fachlich falsch,
--                                            von Hibernate ddl-auto erzeugt)
--
-- Der unconditional Constraint blockierte jede erneute Einlagerung eines
-- bereits einmal CANCELLED Tracking-Codes mit:
--   "duplicate key value violates unique constraint uk<hash>"
--
-- DIESE MIGRATION:
-- 1. Entfernt ALLE unconditional UNIQUE-Constraints (pg_constraint,
--    contype='u') auf dhl_parcels, deren Spaltenmenge EXAKT
--    {store_id, tracking_code} entspricht - unabhängig vom (Hash-)Namen.
--    (Der zugehörige Java-Fix in DhlParcel.java entfernt die @UniqueConstraint
--    Annotation, damit ddl-auto:update ihn nicht erneut anlegt.)
-- 2. Rührt idx_dhl_parcels_active_tracking NICHT an (partial Unique Index,
--    kein pg_constraint-Eintrag, daher von obiger Suche ohnehin nicht
--    betroffen - wird zusätzlich explizit verifiziert).
-- 3. Verändert/löscht KEINE bestehenden Daten.
-- 4. Fasst KEINE andere Migration (V017, V018, V019) an.
-- 5. Ist idempotent für wiederholte Deployment-Läufe (siehe unten).
-- ============================================================================

-- ============================================================================
-- 1. Alle unconditional UNIQUE-Constraints auf exakt (store_id, tracking_code)
--    dynamisch finden und droppen (KEIN Hardcoding eines Constraint-Namens)
-- ============================================================================
--
-- Hinweis: Partial Unique Indexes (wie idx_dhl_parcels_active_tracking), die
-- über "CREATE UNIQUE INDEX ... WHERE ..." angelegt wurden, erzeugen in
-- Postgres KEINEN Eintrag in pg_constraint (contype='u') - sie sind reine
-- Indexe, keine Tabellen-Constraints. Diese Schleife kann sie daher gar
-- nicht erfassen und lässt sie unangetastet.

DO $$
DECLARE
    r RECORD;
    v_dropped_count integer := 0;
BEGIN
    FOR r IN
        SELECT c.conname
        FROM pg_constraint c
        WHERE c.conrelid = 'dhl_parcels'::regclass
          AND c.contype = 'u'
          AND (
              SELECT array_agg(a.attname ORDER BY a.attname)
              FROM unnest(c.conkey) AS k(attnum)
              JOIN pg_attribute a
                ON a.attrelid = c.conrelid AND a.attnum = k.attnum
          ) = ARRAY['store_id', 'tracking_code']::name[]
    LOOP
        EXECUTE format('ALTER TABLE dhl_parcels DROP CONSTRAINT %I', r.conname);
        v_dropped_count := v_dropped_count + 1;
        RAISE NOTICE 'V020: Unconditional unique constraint % auf dhl_parcels(store_id, tracking_code) gedroppt', r.conname;
    END LOOP;

    IF v_dropped_count = 0 THEN
        RAISE NOTICE 'V020: Kein unconditional unique constraint auf (store_id, tracking_code) gefunden - nichts zu tun (idempotenter Re-Run oder bereits sauber)';
    END IF;
END $$;

-- ============================================================================
-- 2. Validierung
-- ============================================================================

DO $$
DECLARE
    v_remaining_conname text;
BEGIN
    -- 2.1. Es darf KEIN unconditional unique constraint auf genau
    --      (store_id, tracking_code) mehr existieren.
    SELECT c.conname INTO v_remaining_conname
    FROM pg_constraint c
    WHERE c.conrelid = 'dhl_parcels'::regclass
      AND c.contype = 'u'
      AND (
          SELECT array_agg(a.attname ORDER BY a.attname)
          FROM unnest(c.conkey) AS k(attnum)
          JOIN pg_attribute a
            ON a.attrelid = c.conrelid AND a.attnum = k.attnum
      ) = ARRAY['store_id', 'tracking_code']::name[]
    LIMIT 1;

    IF v_remaining_conname IS NOT NULL THEN
        RAISE EXCEPTION 'Migration V020 fehlgeschlagen: unconditional unique constraint % auf (store_id, tracking_code) existiert noch', v_remaining_conname;
    END IF;

    -- 2.2. idx_dhl_parcels_active_tracking (aus V017) MUSS weiterhin existieren
    --      - diese Migration darf ihn nicht entfernt/verändert haben.
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'dhl_parcels'
          AND indexname = 'idx_dhl_parcels_active_tracking'
    ) THEN
        RAISE EXCEPTION 'Migration V020 fehlgeschlagen: idx_dhl_parcels_active_tracking (aus V017) fehlt - darf von dieser Migration nicht verändert worden sein';
    END IF;

    RAISE NOTICE 'Migration V020 validation successful ✅ - kein unconditional unique constraint mehr, idx_dhl_parcels_active_tracking unverändert vorhanden';
END $$;
