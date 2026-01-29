import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado');

    const cmds = [
        'echo "=== IMAGENS DOCKER ==="',
        'docker images | grep -E "ublo|front|back"',
        'echo ""',
        'echo "=== CONTAINERS RODANDO ==="',
        'docker ps --format "{{.Names}}: {{.Image}}"',
        'echo ""',
        'echo "=== SERVIÇOS DOCKER SWARM ==="',
        'docker service ls',
        'echo ""',
        'echo "=== INSPECT UBLOCHAT_FRONTEND IMAGE ==="',
        'docker service inspect ublochat_frontend 2>/dev/null | grep -A3 "Image" || echo "Serviço não encontrado"'
    ];

    conn.exec(cmds.join(' && '), (err, stream) => {
        if (err) throw err;

        let output = '';
        stream.on('data', (data) => output += data.toString());
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
