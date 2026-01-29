import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor Supabase');

    // Check if tables have data
    const queries = [
        "SELECT COUNT(*) FROM plans;",
        "SELECT COUNT(*) FROM system_settings;",
        "SELECT COUNT(*) FROM subscriptions;"
    ];

    conn.exec(`docker exec $(docker ps -q -f name=supabase_db) psql -U postgres -d postgres -c "${queries.join(';')}"`, (err, stream) => {
        if (err) throw err;

        let output = '';
        stream.on('data', (data) => output += data.toString());
        stream.stderr.on('data', (data) => output += data.toString());
        stream.on('close', () => {
            console.log('=== DATA COUNTS ===');
            console.log(output);
            conn.end();
        });
    });
}).connect({ host: '194.163.189.247', port: 22, username: 'root', password: 'zlPnsbN8y37?Xyaw', readyTimeout: 120000 });
