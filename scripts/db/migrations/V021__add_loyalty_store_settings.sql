-- ════════════════════════════════════════════════════════════════
-- Migration V021: Loyalty Store Settings (Regression-Fix)
-- ════════════════════════════════════════════════════════════════
-- ZWECK:
--   Legt die 3 NOT-NULL Loyalty-Konfigurationsspalten auf "stores" sicher an.
--   Diese Spalten wurden ursprünglich nur über Hibernate ddl-auto=update
--   ergänzt. Da Java-Feld-Defaults (z.B. "private Boolean loyaltyEnabled =
--   false;") KEINE DB-Defaults sind, konnte Hibernate "ADD COLUMN ... NOT
--   NULL" auf der bereits befüllten stores-Tabelle nicht anlegen ->
--   Spalten fehlten in Production -> jede Query auf Store (u.a.
--   StoreRepository.findByIdWithOwner, verwendet von StoreAccessChecker)
--   schlug mit "column does not exist" fehl -> StoreAccessChecker fing das
--   ab und lieferte fälschlich false -> 403 Forbidden für ALLE Stores,
--   nicht nur Loyalty-Endpunkte (Regression von GET /api/stores/{id}).
--
-- VORGEHEN je Spalte (idempotent, kein Datenverlust):
--   1. Spalte hinzufügen, falls sie fehlt (ADD COLUMN IF NOT EXISTS, nullable)
--   2. NUR NULL-Werte backfillen (bestehende Werte bleiben unverändert)
--   3. DB-Default setzen
--   4. NOT NULL setzen
--
-- BETROFFENE SPALTEN:
--   loyalty_enabled          BOOLEAN        DEFAULT FALSE
--   loyalty_amount_step      NUMERIC(15,2)  DEFAULT 10.00
--   loyalty_points_per_step  INTEGER        DEFAULT 1
--
-- loyalty_minimum_purchase bleibt bewusst NULLABLE (optionales Feld in
-- Store.java, kein NOT NULL) - hier reicht ADD COLUMN IF NOT EXISTS.
--
-- HINWEIS ZUM MIGRATIONSPFAD:
--   Das produktive Deployment (scripts/deploy.sh) führt ausschließlich SQL-
--   Dateien aus scripts/db/migrations/ aus (siehe deploy.sh: MIGRATIONS_DIR=
--   "$SCRIPT_DIR_DEPLOY/db/migrations", alphabetisch sortiert, via
--   `sudo -u postgres psql -f`). Die Ordner scripts/db/migration/ (Singular)
--   und src/main/resources/db/migration/ werden vom Deployment NICHT
--   verwendet (Flyway ist projektweit deaktiviert: spring.flyway.enabled=
--   false, keine Flyway-Dependency in pom.xml). Eine zuvor dort abgelegte
--   Loyalty-Migration (V016) war daher inert und wurde entfernt, um
--   doppelte/verwirrende Migrationsdateien zu vermeiden - diese V021-Datei
--   hier ist die einzige aktive Loyalty-Migration.
-- ════════════════════════════════════════════════════════════════

-- ─── loyalty_enabled ─────────────────────────────────────────────

ALTER TABLE stores
    ADD COLUMN IF NOT EXISTS loyalty_enabled BOOLEAN;

UPDATE stores
    SET loyalty_enabled = FALSE
    WHERE loyalty_enabled IS NULL;

ALTER TABLE stores
    ALTER COLUMN loyalty_enabled SET DEFAULT FALSE;

ALTER TABLE stores
    ALTER COLUMN loyalty_enabled SET NOT NULL;

-- ─── loyalty_amount_step ─────────────────────────────────────────

ALTER TABLE stores
    ADD COLUMN IF NOT EXISTS loyalty_amount_step NUMERIC(15,2);

UPDATE stores
    SET loyalty_amount_step = 10.00
    WHERE loyalty_amount_step IS NULL;

ALTER TABLE stores
    ALTER COLUMN loyalty_amount_step SET DEFAULT 10.00;

ALTER TABLE stores
    ALTER COLUMN loyalty_amount_step SET NOT NULL;

-- ─── loyalty_points_per_step ─────────────────────────────────────

ALTER TABLE stores
    ADD COLUMN IF NOT EXISTS loyalty_points_per_step INTEGER;

UPDATE stores
    SET loyalty_points_per_step = 1
    WHERE loyalty_points_per_step IS NULL;

ALTER TABLE stores
    ALTER COLUMN loyalty_points_per_step SET DEFAULT 1;

ALTER TABLE stores
    ALTER COLUMN loyalty_points_per_step SET NOT NULL;

-- ─── loyalty_minimum_purchase (optional, bleibt NULLABLE) ────────

ALTER TABLE stores
    ADD COLUMN IF NOT EXISTS loyalty_minimum_purchase NUMERIC(15,2);

-- ─── Kommentare für Dokumentation ─────────────────────────────────

COMMENT ON COLUMN stores.loyalty_enabled IS
    'Loyalty/Bonuspunkte-System für diesen Store aktiviert?';

COMMENT ON COLUMN stores.loyalty_amount_step IS
    'Einkaufswert-Schrittweite für Punkteberechnung (z.B. 10.00 = je 10 Einheiten Währung)';

COMMENT ON COLUMN stores.loyalty_points_per_step IS
    'Punkte pro Schrittweite (z.B. 1 = 1 Punkt je loyalty_amount_step)';

COMMENT ON COLUMN stores.loyalty_minimum_purchase IS
    'Optionaler Mindest-Einkaufswert, ab dem Punkte gutgeschrieben werden (NULL = keine Mindestgrenze)';

-- ─── Validierung ──────────────────────────────────────────────────

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'stores' AND column_name = 'loyalty_enabled' AND is_nullable = 'YES'
    ) THEN
        RAISE EXCEPTION 'Migration V021 fehlgeschlagen: stores.loyalty_enabled ist noch NULLABLE';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'stores' AND column_name = 'loyalty_amount_step' AND is_nullable = 'YES'
    ) THEN
        RAISE EXCEPTION 'Migration V021 fehlgeschlagen: stores.loyalty_amount_step ist noch NULLABLE';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'stores' AND column_name = 'loyalty_points_per_step' AND is_nullable = 'YES'
    ) THEN
        RAISE EXCEPTION 'Migration V021 fehlgeschlagen: stores.loyalty_points_per_step ist noch NULLABLE';
    END IF;

    RAISE NOTICE 'Migration V021 validation successful ✅ - loyalty_enabled/loyalty_amount_step/loyalty_points_per_step sind NOT NULL mit DB-Default, loyalty_minimum_purchase existiert (nullable)';
END $$;

-- ════════════════════════════════════════════════════════════════
-- Migration abgeschlossen
-- ════════════════════════════════════════════════════════════════
