import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor Supabase');

    // Check triggers on auth.users
    const sql = `
SELECT 
    trig.tgname AS trigger_name,
    func.proname AS function_name
FROM pg_trigger trig
JOIN pg_class cls ON trig.tgrelid = cls.oid
JOIN pg_namespace nsp ON cls.relnamespace = nsp.oid
JOIN pg_proc func ON trig.tgfoid = func.oid
WHERE nsp.nspname = 'auth' AND cls.relname = 'users';
`;

    conn.exec(`docker exec $(docker ps -q -f name=supabase_db) psql -U postgres -d postgres -c "${sql}"`, (err, stream) => {
        if (err) throw err;

        let output = '';
        stream.on('data', (data) => output += data.toString());
        stream.stderr.on('data', (data) => output += data.toString());
        stream.on('close', () => {
            console.log('=== TRIGGERS EM auth.users ===');
            console.log(output);
            conn.end();
        });
    });
}).connect({ host: '194.163.189.247', port: 22, username: 'root', password: 'zlPnsbN8y37?Xyaw', readyTimeout: 120000 });
