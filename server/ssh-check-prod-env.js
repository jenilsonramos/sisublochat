import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor de produção');

    const cmds = [
        'cd /root/ublochat',
        'echo "=== CONTEÚDO DO .ENV NO SERVIDOR ==="',
        'cat server/.env 2>&1 || cat .env 2>&1',
        'echo ""',
        'echo "=== VERIFICANDO SE BACKEND ESTÁ RODANDO ==="',
        'docker ps | grep -E "backend|app"',
        'echo ""',
        'echo "=== LOGS DO BACKEND ==="',
        'docker logs ublochat-backend-1 2>&1 | tail -30 || docker logs ublochat-app-1 2>&1 | tail -30'
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
