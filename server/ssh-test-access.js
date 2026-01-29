import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor Supabase');

    // Test select for authenticated role
    const sql = `
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN (SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE') LOOP
        BEGIN
            EXECUTE format('SET ROLE authenticated; SELECT 1 FROM %I LIMIT 0; RESET ROLE;', t);
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Role authenticated CANNOT select from %: %', t, SQLERRM;
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
            console.log('=== TESTE DE ACESSO AUTHENTICATED ===');
            console.log(output);
            conn.end();
        });
    });
}).connect({ host: '194.163.189.247', port: 22, username: 'root', password: 'zlPnsbN8y37?Xyaw', readyTimeout: 120000 });
