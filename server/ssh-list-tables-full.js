import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor Supabase');

    // List all tables in public schema - use a way that avoids truncation
    const sql = "SELECT quote_ident(table_name) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name;";

    conn.exec(`docker exec $(docker ps -q -f name=supabase_db) psql -U postgres -d postgres -t -c "${sql}"`, (err, stream) => {
        if (err) throw err;

        let output = '';
        stream.on('data', (data) => output += data.toString());
        stream.stderr.on('data', (data) => output += data.toString());
        stream.on('close', () => {
            console.log('=== LISTA COMPLETA DE TABELAS ===');
            const tables = output.split('\n').map(t => t.trim()).filter(t => t);
            console.log(tables.join(', '));
            conn.end();
        });
    });
}).connect({ host: '194.163.189.247', port: 22, username: 'root', password: 'zlPnsbN8y37?Xyaw', readyTimeout: 120000 });
