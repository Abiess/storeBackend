-- Flyway Migration V3: Setup Database Permissions
-- Stellt sicher, dass der storeapp User die richtigen Berechtigungen hat

-- Setze Ownership und Berechtigungen für alle Tabellen und Sequences
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Prüfe ob storeapp User existiert
    IF EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'storeapp') THEN

        RAISE NOTICE 'Setting up permissions for storeapp user...';

        -- GRANT auf public Schema
        GRANT USAGE ON SCHEMA public TO storeapp;
        GRANT CREATE ON SCHEMA public TO storeapp;

        -- Ownership für alle existierenden Tabellen
        FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname='public') LOOP
            EXECUTE format('ALTER TABLE public.%I OWNER TO storeapp', r.tablename);
            RAISE NOTICE 'Changed owner of table % to storeapp', r.tablename;
        END LOOP;

        -- Ownership für alle Sequences
        FOR r IN (SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema='public') LOOP
            EXECUTE format('ALTER SEQUENCE public.%I OWNER TO storeapp', r.sequence_name);
            RAISE NOTICE 'Changed owner of sequence % to storeapp', r.sequence_name;
        END LOOP;

        -- GRANT ALL auf alle Tabellen
        GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO storeapp;

        -- GRANT ALL auf alle Sequences
        GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO storeapp;

        -- Default Privileges für zukünftige Objekte
        ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO storeapp;
        ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO storeapp;

        RAISE NOTICE '✅ Permissions setup completed successfully for storeapp';

    ELSE
        RAISE WARNING '⚠️  User storeapp does not exist - skipping permission setup';
        RAISE NOTICE 'Create user first: CREATE USER storeapp WITH PASSWORD ''your_password'';';
    END IF;
END
$$;

-- Setze auch Ownership auf flyway_schema_history (falls noch nicht gesetzt)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'storeapp') THEN
        IF EXISTS (SELECT FROM pg_tables WHERE schemaname='public' AND tablename='flyway_schema_history') THEN
            ALTER TABLE public.flyway_schema_history OWNER TO storeapp;
            RAISE NOTICE 'Changed owner of flyway_schema_history to storeapp';
        END IF;
    END IF;
END
$$;

