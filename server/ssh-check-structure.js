import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor de produção');

    const cmds = [
        'cd /root/ublochat',
        'echo "=== ESTRUTURA DO PROJETO ==="',
        'ls -la',
        'echo ""',
        'echo "=== DOCKER COMPOSE ==="',
        'cat docker-compose.prod.yml | grep -A10 "backend\\|environment" | head -40',
        'echo ""',
        'echo "=== ENV DO SERVIDOR ==="',
        'cat server/.env 2>/dev/null | head -20',
        'echo ""',
        'echo "=== CONTAINERS ATIVOS ==="',
        'docker ps --format "{{.Names}} | {{.Status}}"'
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
