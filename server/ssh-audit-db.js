import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor Supabase');

    const cmds = [
        'echo "=== USUÁRIOS NO BANCO ==="',
        'docker exec $(docker ps -q -f name=supabase_db) psql -U postgres -d postgres -c "SELECT id, email FROM profiles;" 2>&1',
        'echo ""',
        'echo "=== LISTANDO TODAS AS TABELAS NO SCHEMA PUBLIC ==="',
        'docker exec $(docker ps -q -f name=supabase_db) psql -U postgres -d postgres -c "\\dt" 2>&1'
    ];

    conn.exec(cmds.join(' && '), (err, stream) => {
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
