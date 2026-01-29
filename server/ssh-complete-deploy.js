import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor de produção');

    const cmds = [
        'cd /root/ublochat',
        'echo "=== GIT PULL ==="',
        'git pull origin main 2>&1',
        'echo ""',
        'echo "=== NPM INSTALL ==="',
        'npm install 2>&1 | tail -5',
        'echo ""',
        'echo "=== NPM BUILD ==="',
        'npm run build 2>&1 | tail -10',
        'echo ""',
        'echo "=== REBUILD CONTAINERS ==="',
        'docker compose -f docker-compose.prod.yml down 2>&1 | tail -5',
        'docker compose -f docker-compose.prod.yml build --no-cache 2>&1 | tail -20',
        'docker compose -f docker-compose.prod.yml up -d 2>&1 | tail -10',
        'echo ""',
        'echo "=== STATUS DOS CONTAINERS ==="',
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
    readyTimeout: 600000
});
