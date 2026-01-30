-- Flyway Migration V3: Setup Database Permissions (MINIMAL VERSION)
-- WARNUNG: Diese Migration wurde auf minimal reduziert um Locks zu vermeiden
-- Die vollständigen Permissions werden AUSSERHALB von Flyway gesetzt (via fix-db-password.sh)

-- Explizit public Schema setzen
SET search_path TO public;

-- Setze nur KRITISCHE Basis-Rechte (schnell, kein Lock-Risiko)
DO $$
BEGIN
    -- Prüfe ob storeapp User existiert
    IF EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'storeapp') THEN

        RAISE NOTICE 'V3: Setting minimal permissions for storeapp (fast)';

        -- Nur Basis-Schema-Rechte (KEIN Owner-Wechsel!)
        GRANT USAGE ON SCHEMA public TO storeapp;
        GRANT CREATE ON SCHEMA public TO storeapp;

        -- Grant auf existierende Objekte (schnell)
        GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO storeapp;
        GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO storeapp;

        RAISE NOTICE 'V3: Minimal permissions set - full permissions are handled by deployment scripts';

    ELSE
        RAISE NOTICE 'V3: User storeapp does not exist yet - skipping (will be handled by deployment)';
    END IF;
END
$$;

-- HINWEIS: Vollständige Permissions (inkl. DEFAULT PRIVILEGES) werden von
-- fix-db-password.sh gesetzt, welches VOR diesem Flyway-Lauf ausgeführt wird!
-- Siehe: .github/workflows/deploy.yml → "Setup PostgreSQL Database" Step
