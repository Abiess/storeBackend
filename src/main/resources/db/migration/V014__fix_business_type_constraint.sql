-- V014: Fix business_type CHECK constraint to include SERVICE
--
-- Problem: PostgreSQL production DB hat einen CHECK constraint der SERVICE nicht erlaubt
-- Lösung: Constraint droppen und neu erstellen mit allen 4 BusinessTypes
--
-- NACH DIESER MIGRATION:
-- ✓ SHOP        erlaubt
-- ✓ RESTAURANT  erlaubt
-- ✓ RIAD        erlaubt
-- ✓ SERVICE     erlaubt (NEU - war vorher der Fehler)
-- ✗ INVALID     nicht erlaubt (wie erwartet)

-- 1. Bestehenden Constraint entfernen (falls vorhanden)
ALTER TABLE stores DROP CONSTRAINT IF EXISTS stores_business_type_check;

-- 2. Neuen Constraint mit allen erlaubten BusinessTypes erstellen
ALTER TABLE stores
    ADD CONSTRAINT stores_business_type_check
        CHECK (business_type IN ('SHOP', 'RESTAURANT', 'RIAD', 'SERVICE'));
