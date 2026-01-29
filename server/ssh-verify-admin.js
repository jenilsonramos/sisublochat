import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor Supabase');

    const email = 'ublochat@admin.com';
    const sql = `SELECT id, email, role, status FROM public.profiles WHERE email = '${email}';`;

    conn.exec(`docker exec $(docker ps -q -f name=supabase_db) psql -U postgres -d postgres -c "${sql}"`, (err, stream) => {
        if (err) throw err;

        let output = '';
        stream.on('data', (data) => output += data.toString());
        stream.stderr.on('data', (data) => output += data.toString());
        stream.on('close', () => {
            console.log('=== PERFIL DO ADMIN VERIFICADO ===');
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
