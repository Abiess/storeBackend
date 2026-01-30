-- Grant permissions to storeapp user for public schema
-- PostgreSQL 15+ kompatibel - vollständige Rechte
-- Idempotent - kann mehrfach ausgeführt werden

-- 1. Schema Owner setzen (KRITISCH für PostgreSQL 15+)
ALTER SCHEMA public OWNER TO storeapp;

-- 2. Explizite Schema-Rechte
GRANT ALL PRIVILEGES ON SCHEMA public TO storeapp;
GRANT CREATE ON SCHEMA public TO storeapp;
GRANT USAGE ON SCHEMA public TO storeapp;

-- 3. Datenbank-Rechte
GRANT ALL PRIVILEGES ON DATABASE storedb TO storeapp;

-- 4. Rechte auf alle existierenden Tabellen
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO storeapp;

-- 5. Rechte auf alle existierenden Sequences
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO storeapp;

-- 6. Rechte auf alle existierenden Functions
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO storeapp;

-- 7. Default Privileges für zukünftige Objekte (erstellt durch storeapp)
ALTER DEFAULT PRIVILEGES FOR USER storeapp IN SCHEMA public
    GRANT ALL ON TABLES TO storeapp;

ALTER DEFAULT PRIVILEGES FOR USER storeapp IN SCHEMA public
    GRANT ALL ON SEQUENCES TO storeapp;

ALTER DEFAULT PRIVILEGES FOR USER storeapp IN SCHEMA public
    GRANT ALL ON FUNCTIONS TO storeapp;

-- 8. Default Privileges für zukünftige Objekte (erstellt durch postgres)
ALTER DEFAULT PRIVILEGES FOR USER postgres IN SCHEMA public
    GRANT ALL ON TABLES TO storeapp;

ALTER DEFAULT PRIVILEGES FOR USER postgres IN SCHEMA public
    GRANT ALL ON SEQUENCES TO storeapp;

ALTER DEFAULT PRIVILEGES FOR USER postgres IN SCHEMA public
    GRANT ALL ON FUNCTIONS TO storeapp;

-- 9. Ownership aller existierenden Tabellen übertragen
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname='public') LOOP
        EXECUTE format('ALTER TABLE public.%I OWNER TO storeapp', r.tablename);
        EXECUTE format('GRANT ALL PRIVILEGES ON TABLE public.%I TO storeapp', r.tablename);
    END LOOP;

    FOR r IN (SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema='public') LOOP
        EXECUTE format('ALTER SEQUENCE public.%I OWNER TO storeapp', r.sequence_name);
        EXECUTE format('GRANT ALL PRIVILEGES ON SEQUENCE public.%I TO storeapp', r.sequence_name);
    END LOOP;
END $$;
