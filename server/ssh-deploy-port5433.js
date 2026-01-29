import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor de produção');

    const cmds = [
        'cd /root/ublochat',
        'echo "=== GIT PULL ==="',
        'git pull origin main 2>&1',
        'echo ""',
        'echo "=== PARANDO BACKEND ==="',
        'docker compose -f docker-compose.prod.yml stop app_backend 2>&1',
        'echo ""',
        'echo "=== REBUILD DO BACKEND ==="',
        'docker compose -f docker-compose.prod.yml build --no-cache app_backend 2>&1 | tail -15',
        'echo ""',
        'echo "=== SUBINDO BACKEND ==="',
        'docker compose -f docker-compose.prod.yml up -d app_backend 2>&1',
        'echo ""',
        'echo "=== AGUARDANDO 10s ==="',
        'sleep 10',
        'echo ""',
        'echo "=== LOGS DO BACKEND ==="',
        'docker logs ublochat_backend 2>&1 | tail -30'
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
    readyTimeout: 600000
});
