import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado');

    const cmds = [
        'cd /root/ublochat',
        'echo "=== GIT PULL ==="',
        'git pull origin main 2>&1',
        'echo ""',
        'echo "=== REBUILD DO FRONTEND ==="',
        'npm run build 2>&1 | tail -15',
        'echo ""',
        'echo "=== PARANDO CONTAINERS ANTIGOS ==="',
        'docker stop ublochat_frontend ublochat_backend ublochat_caddy 2>/dev/null || echo "Containers parados"',
        'docker rm ublochat_frontend ublochat_backend ublochat_caddy 2>/dev/null || echo "Containers removidos"',
        'echo ""',
        'echo "=== REBUILD DAS IMAGENS ==="',
        'docker-compose -f docker-compose.prod.yml build --no-cache 2>&1 | tail -30',
        'echo ""',
        'echo "=== INICIANDO CONTAINERS ==="',
        'docker-compose -f docker-compose.prod.yml up -d 2>&1',
        'echo ""',
        'echo "=== STATUS ==="',
        'docker ps | grep ublochat'
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
    readyTimeout: 300000
});
