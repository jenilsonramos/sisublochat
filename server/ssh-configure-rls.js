import { Client } from 'ssh2';
import fs from 'fs';

const conn = new Client();

// Read the SQL file
const sqlContent = fs.readFileSync('./server/configure_rls.sql', 'utf8');

// Escape single quotes for shell
const escapedSql = sqlContent.replace(/'/g, "'\\''");

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor Supabase');

    // Execute SQL in the supabase_db container
    const cmd = `docker exec $(docker ps -q -f name=supabase_db) psql -U postgres -d postgres -c '${escapedSql}'`;

    conn.exec(cmd, (err, stream) => {
        if (err) throw err;

        let output = '';
        stream.on('data', (data) => output += data.toString());
        stream.stderr.on('data', (data) => output += data.toString());
        stream.on('close', () => {
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
