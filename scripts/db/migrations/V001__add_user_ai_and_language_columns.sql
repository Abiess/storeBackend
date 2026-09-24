-- =====================================================================
-- Migration V001: Fehlende User-Spalten (ai_calls + preferred_language)
-- =====================================================================
-- Wird automatisch von deploy.sh nach jedem Deployment ausgeführt.
-- Vollständig idempotent (sicher bei mehrfacher Ausführung).
-- =====================================================================

BEGIN;

-- 1. ai_calls_this_month -----------------------------------------------
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS ai_calls_this_month INTEGER;

UPDATE users
   SET ai_calls_this_month = 0
 WHERE ai_calls_this_month IS NULL;

ALTER TABLE users
    ALTER COLUMN ai_calls_this_month SET DEFAULT 0;

ALTER TABLE users
    ALTER COLUMN ai_calls_this_month SET NOT NULL;

-- 2. ai_calls_period_start ---------------------------------------------
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS ai_calls_period_start TIMESTAMP;

-- 3. preferred_language ------------------------------------------------
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(5);

UPDATE users
   SET preferred_language = 'en'
 WHERE preferred_language IS NULL;

ALTER TABLE users
    ALTER COLUMN preferred_language SET DEFAULT 'en';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'users_preferred_language_check'
    ) THEN
        ALTER TABLE users
            ADD CONSTRAINT users_preferred_language_check
            CHECK (preferred_language IN ('en', 'de', 'ar'));
    END IF;
END$$;

COMMIT;

