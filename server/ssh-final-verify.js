import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Client :: Connected');

    // List all tables with count
    const cmd = `docker exec supabase_db psql -U postgres -d postgres -t -A -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;"`;

    conn.exec(cmd, (err, stream) => {
        if (err) {
            console.error('❌ Exec Error:', err.message);
            conn.end();
            return;
        }

        let output = '';

        stream.on('data', (data) => {
            output += data.toString();
        });

        stream.on('close', (code) => {
            const tables = output.trim().split('\n').filter(t => t.length > 0);
            console.log('=== TABELAS CRIADAS ===');
            tables.forEach((t, i) => console.log(`${i + 1}. ${t}`));
            console.log(`\n✅ Total: ${tables.length} tabelas`);
            console.log('=======================');
            conn.end();
        });
    });
}).connect({
    host: '194.163.189.247',
    port: 22,
    username: 'root',
    password: 'zlPnsbN8y37?Xyaw',
    readyTimeout: 30000
});

conn.on('error', (err) => {
    console.error('❌ SSH Connection Error:', err.message);
});
