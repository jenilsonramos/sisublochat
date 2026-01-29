import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor Supabase');

    // Check schema usage and table privileges
    const queries = [
        "SELECT has_schema_privilege('authenticated', 'public', 'USAGE');",
        "SELECT grantee, table_name, privilege_type FROM information_schema.role_table_grants WHERE grantee = 'authenticated' AND table_schema = 'public' AND table_name IN ('profiles', 'plans', 'subscriptions');"
    ];

    conn.exec(`docker exec $(docker ps -q -f name=supabase_db) psql -U postgres -d postgres -c "${queries.join(';')}"`, (err, stream) => {
        if (err) throw err;

        let output = '';
        stream.on('data', (data) => output += data.toString());
        stream.stderr.on('data', (data) => output += data.toString());
        stream.on('close', () => {
            console.log('=== PRIVILÉGIOS DE ROLE ===');
            console.log(output);
            conn.end();
        });
    });
}).connect({ host: '194.163.189.247', port: 22, username: 'root', password: 'zlPnsbN8y37?Xyaw', readyTimeout: 120000 });
