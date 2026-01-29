import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor Supabase');

    // Check search_path and permissions
    const sql = `
-- Check search_path
SHOW search_path;

-- Check if authenticated has usage on all schemas
SELECT nspname, 
  has_schema_privilege('authenticated', nspname, 'USAGE') as auth_usage,
  has_schema_privilege('anon', nspname, 'USAGE') as anon_usage
FROM pg_namespace 
WHERE nspname IN ('public', 'auth', 'extensions', 'storage');

-- Check for broken views
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT nspname, relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relkind = 'v' AND n.nspname = 'public') LOOP
        BEGIN
            EXECUTE format('SELECT 1 FROM %I.%I LIMIT 0', r.nspname, r.relname);
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Broken view: %.% - %', r.nspname, r.relname, SQLERRM;
        END;
    END LOOP;
END $$;
`;

    conn.exec(`docker exec $(docker ps -q -f name=supabase_db) psql -U postgres -d postgres -c "${sql}"`, (err, stream) => {
        if (err) throw err;

        let output = '';
        stream.on('data', (data) => output += data.toString());
        stream.stderr.on('data', (data) => output += data.toString());
        stream.on('close', () => {
            console.log('=== AUDITORIA DE SCHEMA ===');
            console.log(output);
            conn.end();
        });
    });
}).connect({ host: '194.163.189.247', port: 22, username: 'root', password: 'zlPnsbN8y37?Xyaw', readyTimeout: 120000 });
