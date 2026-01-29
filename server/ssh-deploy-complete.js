import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor de Produção');

    const cmd = `
cd /root/ublochat
echo "=== GIT PULL ==="
git pull origin main

echo ""
echo "=== REBUILD DOCKER ==="
docker compose down 2>/dev/null || docker-compose down
docker compose build --no-cache 2>/dev/null || docker-compose build --no-cache
docker compose up -d 2>/dev/null || docker-compose up -d

echo ""
echo "=== STATUS FINAL ==="
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
`;

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
}).connect({ host: '77.42.84.214', port: 22, username: 'root', password: 'X4cusMK3tHWv', readyTimeout: 120000 });
