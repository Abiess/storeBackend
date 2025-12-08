-- Grant permissions to storeapp user for public schema
-- This must be run as postgres superuser

-- Grant all privileges on public schema to storeapp
GRANT ALL PRIVILEGES ON SCHEMA public TO storeapp;

-- Grant create table permission
GRANT CREATE ON SCHEMA public TO storeapp;

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO storeapp;

-- Grant all on all tables in public schema
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO storeapp;

-- Grant all on all sequences in public schema (for BIGSERIAL)
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO storeapp;

-- Make storeapp owner of public schema
ALTER SCHEMA public OWNER TO storeapp;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO storeapp;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO storeapp;

