-- FIX PERMISSIONS AND RELOAD CACHE

-- 1. Grant usage on schema public to anon and authenticated
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- 2. Grant all privileges on all tables in schema public to anon and authenticated
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

-- 3. Ensure default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;

-- 4. Reload PostgREST Cache (Again)
NOTIFY pgrst, 'reload config';
