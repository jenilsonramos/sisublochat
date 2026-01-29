import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor Supabase');

    const sql = `
-- Disable RLS on all tables to debug schema error
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN (SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE') LOOP
        EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY;', t);
    END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
`;

    const base64Sql = Buffer.from(sql).toString('base64');
    const cmd = `
echo "${base64Sql}" | base64 -d > /tmp/disable_rls.sql
docker exec -i $(docker ps -q -f name=supabase_db) psql -U postgres -d postgres < /tmp/disable_rls.sql
`;

    conn.exec(cmd, (err, stream) => {
        if (err) throw err;

        let output = '';
        stream.on('data', (data) => output += data.toString());
        stream.stderr.on('data', (data) => output += data.toString());
        stream.on('close', () => {
            console.log('=== RLS DISABLED (DEBUG) ===');
            console.log(output);
            conn.end();
        });
    });
}).connect({ host: '194.163.189.247', port: 22, username: 'root', password: 'zlPnsbN8y37?Xyaw', readyTimeout: 120000 });
