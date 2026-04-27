-- ============================================================
-- FIX: media-Tabelle hat doppelte Spalten filename + file_name
-- Ursache: ddl-auto=update hat file_name neu angelegt, obwohl
--          filename bereits existierte.
-- Lösung:  file_name-Spalte entfernen (Entity nutzt filename).
-- ============================================================

-- Schritt 1: Sicherstellen dass filename alle Daten hat
--            (falls file_name schon Daten hat, erst kopieren)
UPDATE media
SET filename = file_name
WHERE filename IS NULL AND file_name IS NOT NULL;

-- Schritt 2: file_name-Spalte droppen
ALTER TABLE media DROP COLUMN IF EXISTS file_name;

-- Schritt 3: Sicherstellen dass filename NOT NULL Constraint korrekt ist
ALTER TABLE media ALTER COLUMN filename SET NOT NULL;

-- Fertig – Entity @Column(name = "filename") passt jetzt zur DB.

