-- ════════════════════════════════════════════════════════════════
-- Migration: Loyalty-/Bonuspunkte Store-Konfiguration (Regression-Fix)
-- Version: V016__add_loyalty_store_settings.sql
-- Datum: 2026-09-03
-- ════════════════════════════════════════════════════════════════
-- HINTERGRUND:
--   Der Loyalty-Commit hat in Store.java drei NOT-NULL-Spalten ergänzt
--   (loyalty_enabled, loyalty_amount_step, loyalty_points_per_step).
--   Hibernate ddl-auto=update konnte diese NOT-NULL-Spalten auf der
--   bereits befüllten "stores"-Tabelle nicht anlegen (Postgres verweigert
--   ALTER TABLE ... ADD COLUMN ... NOT NULL ohne DEFAULT bei existierenden
--   Zeilen). Dadurch schlugen ALLE Hibernate-Queries auf Store fehl,
--   inkl. StoreAccessChecker -> fälschlich 403 auf bestehende Endpoints.
--
-- HINWEIS (WICHTIG):
--   Flyway ist in diesem Projekt aktuell NICHT auf dem Classpath
--   (keine flyway-core Dependency in pom.xml) und spring.flyway.enabled=false.
--   Diese Datei liegt hier als dokumentierte, korrekte Migration für den Fall,
--   dass Flyway künftig aktiviert wird (nächste freie Versionsnummer nach V015).
--   Der tatsächliche Laufzeit-Fix für den aktuellen Regressionsbug erfolgt
--   über den bestehenden DataInitializer-Mechanismus (siehe DataInitializer.java,
--   Methode repairLoyaltyStoreColumns()), da dieser ohne neue Migrationstechnologie
--   auskommt und beim nächsten Deploy sofort wirkt.
--
-- VORGEHEN JE SPALTE (nullable -> backfill -> DB-Default -> NOT NULL):
--   1. Spalte hinzufügen, falls sie fehlt (IF NOT EXISTS)
--   2. Nur NULL-Werte mit Defaultwert backfillen (keine bestehenden Werte überschreiben)
--   3. DB-Default setzen
--   4. NOT NULL setzen
-- Idempotent: Datei kann beliebig oft ausgeführt werden, ohne Fehler oder
-- Datenverlust (ADD COLUMN IF NOT EXISTS, UPDATE nur WHERE ... IS NULL,
-- SET DEFAULT/SET NOT NULL sind in Postgres wiederholbar).
-- ════════════════════════════════════════════════════════════════

-- ─── loyalty_enabled ──────────────────────────────────────────────
ALTER TABLE stores ADD COLUMN IF NOT EXISTS loyalty_enabled BOOLEAN;

UPDATE stores
SET loyalty_enabled = FALSE
WHERE loyalty_enabled IS NULL;

ALTER TABLE stores ALTER COLUMN loyalty_enabled SET DEFAULT FALSE;
ALTER TABLE stores ALTER COLUMN loyalty_enabled SET NOT NULL;

-- ─── loyalty_amount_step ──────────────────────────────────────────
ALTER TABLE stores ADD COLUMN IF NOT EXISTS loyalty_amount_step NUMERIC(15,2);

UPDATE stores
SET loyalty_amount_step = 10.00
WHERE loyalty_amount_step IS NULL;

ALTER TABLE stores ALTER COLUMN loyalty_amount_step SET DEFAULT 10.00;
ALTER TABLE stores ALTER COLUMN loyalty_amount_step SET NOT NULL;

-- ─── loyalty_points_per_step ──────────────────────────────────────
ALTER TABLE stores ADD COLUMN IF NOT EXISTS loyalty_points_per_step INTEGER;

UPDATE stores
SET loyalty_points_per_step = 1
WHERE loyalty_points_per_step IS NULL;

ALTER TABLE stores ALTER COLUMN loyalty_points_per_step SET DEFAULT 1;
ALTER TABLE stores ALTER COLUMN loyalty_points_per_step SET NOT NULL;

-- ─── loyalty_minimum_purchase (bereits nullable, kein Fix nötig) ──
-- Diese Spalte ist bewusst nullable (kein Mindest-Einkaufswert = kein Fehler),
-- daher hier nur zur Vollständigkeit als Kommentar dokumentiert.
-- ALTER TABLE stores ADD COLUMN IF NOT EXISTS loyalty_minimum_purchase NUMERIC(15,2);

COMMENT ON COLUMN stores.loyalty_enabled IS 'Loyalty-/Bonuspunkte-Programm für diesen Store aktiviert';
COMMENT ON COLUMN stores.loyalty_amount_step IS 'Betrags-Schritt für Punkteberechnung (währungsunabhängig)';
COMMENT ON COLUMN stores.loyalty_points_per_step IS 'Anzahl Punkte pro amountStep';
