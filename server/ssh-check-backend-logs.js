import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor de produção');

    const cmds = [
        'cd /root/ublochat',
        'echo "=== LOGS DO BACKEND (últimos 50) ==="',
        'docker logs ublochat-backend-1 2>&1 | tail -50',
        'echo ""',
        'echo "=== VERIFICANDO MENSAGENS NO BANCO ==="',
        'docker exec ublochat_db psql -U postgres -d postgres -c "SELECT id, conversation_id, text, sender, timestamp FROM messages ORDER BY timestamp DESC LIMIT 5;" 2>&1'
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
    host: '77.42.84.214',
    port: 22,
    username: 'root',
    password: 'heagkwqejgxh',
    readyTimeout: 60000
});
