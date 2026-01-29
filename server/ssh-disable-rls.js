import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor Supabase');

    // Execute SQL commands to disable RLS on all tables and create permissive policies
    const sqlCommands = `
-- Disable RLS and create permissive policies for all tables
DO \\$\\$
DECLARE
    r RECORD;
BEGIN
    -- Loop through all tables in public schema
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        -- Disable RLS
        EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', r.tablename);
        RAISE NOTICE 'Disabled RLS on %', r.tablename;
    END LOOP;
END
\\$\\$;

SELECT 'RLS disabled on all public tables' as status;
`;

    conn.exec(`docker exec $(docker ps -q -f name=supabase_db) psql -U postgres -d postgres -c "${sqlCommands}"`, (err, stream) => {
        if (err) throw err;

        let output = '';
        stream.on('data', (data) => output += data.toString());
        stream.stderr.on('data', (data) => output += data.toString());
        stream.on('close', () => {
            console.log(output);
            conn.end();
        });
    });
}).connect({
    host: '194.163.189.247',
    port: 22,
    username: 'root',
    password: 'zlPnsbN8y37?Xyaw',
    readyTimeout: 120000
});
