import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor Supabase');

    // Test access for authenticated role on critical tables using a safe method
    const sql = `
DO $$
DECLARE
    t text;
    tables_to_test text[] := ARRAY['profiles', 'plans', 'subscriptions', 'system_settings', 'payment_logs'];
BEGIN
    FOR t IN SELECT unnest(tables_to_test) LOOP
        BEGIN
            EXECUTE format('SET ROLE authenticated; SELECT 1 FROM %I LIMIT 0; RESET ROLE;', t);
            RAISE NOTICE 'Role authenticated CAN select from %', t;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Role authenticated CANNOT select from %: %', t, SQLERRM;
        END;
    END LOOP;
END $$;
`;

    const base64Sql = Buffer.from(sql).toString('base64');
    const cmd = `
echo "${base64Sql}" | base64 -d > /tmp/test_access.sql
docker exec -i $(docker ps -q -f name=supabase_db) psql -U postgres -d postgres < /tmp/test_access.sql
`;

    conn.exec(cmd, (err, stream) => {
        if (err) throw err;

        let output = '';
        stream.on('data', (data) => output += data.toString());
        stream.stderr.on('data', (data) => output += data.toString());
        stream.on('close', () => {
            console.log('=== RESULTADO TESTE ACESSO (SEGURO) ===');
            console.log(output);
            conn.end();
        });
    });
}).connect({ host: '194.163.189.247', port: 22, username: 'root', password: 'zlPnsbN8y37?Xyaw', readyTimeout: 120000 });
