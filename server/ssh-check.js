import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('Conectado!');

    const cmd = `docker exec supabase_db psql -U postgres -d postgres -c "SELECT COUNT(*) as count FROM pg_tables WHERE schemaname = 'public';" && docker exec supabase_db psql -U postgres -d postgres -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;"`;

    conn.exec(cmd, (err, stream) => {
        if (err) throw err;

        let output = '';
        stream.on('data', (data) => output += data.toString());
        stream.on('close', () => {
            console.log(output);
            conn.end();
        });
    });
}).connect({
    host: '194.163.189.247',
    port: 22,
    username: 'root',
    password: 'zlPnsbN8y37?Xyaw'
});
