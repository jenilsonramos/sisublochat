import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado');

    const cmds = [
        'echo "=== CONTAINERS RODANDO ==="',
        'docker ps --format "{{.Names}}"',
        'echo ""',
        'echo "=== STACKS ==="',
        'docker stack ls',
        'echo ""',
        'echo "=== SERVICES ==="',
        'docker service ls --format "{{.Name}}: {{.Replicas}}"',
        'echo ""',
        'echo "=== UBLOCHAT SERVICE ==="',
        'docker stack services ublochat 2>/dev/null || echo "Não tem stack ublochat"',
        'echo ""',
        'echo "=== PROCURANDO .env NO /root ==="',
        'cat /root/ublochat/.env 2>/dev/null || cat /root/.env 2>/dev/null || echo "Não encontrado"',
        'echo ""',
        'echo "=== PROCURANDO docker-compose ==="',
        'find /root -name "docker-compose*.yml" 2>/dev/null | head -5'
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
