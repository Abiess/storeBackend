-- Production deployments execute SQL files from scripts/db/migrations.
-- Keep this migration idempotent because deploy.sh runs it on every deploy.
ALTER TABLE stores
    ADD COLUMN IF NOT EXISTS whatsapp_button_enabled BOOLEAN NOT NULL DEFAULT TRUE;
