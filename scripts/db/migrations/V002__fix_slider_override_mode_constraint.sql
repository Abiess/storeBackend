-- =====================================================================
-- Migration V002: Fix chk_override_mode CHECK-Constraint
-- =====================================================================
-- Problem: Constraint erlaubt nur Kleinbuchstaben ('default_only' etc.)
--          aber JPA EnumType.STRING schreibt Grossbuchstaben ('DEFAULT_ONLY')
-- Lösung:  Constraint droppen und mit Grossbuchstaben neu anlegen.
--          Bestehende Daten (lowercase) werden zuerst auf Grossbuchstaben
--          migriert.
-- =====================================================================

BEGIN;

-- Schritt 1: Bestehende lowercase-Werte auf UPPERCASE migrieren
UPDATE store_slider_settings
SET override_mode = UPPER(override_mode)
WHERE override_mode IN ('default_only', 'owner_only', 'mixed');

-- Schritt 2: Alten Constraint droppen
ALTER TABLE store_slider_settings
    DROP CONSTRAINT IF EXISTS chk_override_mode;

-- Schritt 3: Neuen Constraint mit UPPERCASE-Werten anlegen
ALTER TABLE store_slider_settings
    ADD CONSTRAINT chk_override_mode
    CHECK (override_mode IN ('DEFAULT_ONLY', 'OWNER_ONLY', 'MIXED'));

COMMIT;

