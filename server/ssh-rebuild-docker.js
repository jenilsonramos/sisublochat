import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor de Produção');

    const cmd = `
echo "=== DOCKER COMPOSE FILE ==="
cat /root/ublochat/docker-compose.yml

echo ""
echo "=== DOCKERFILE ==="
cat /root/ublochat/Dockerfile 2>/dev/null || echo "No Dockerfile"

echo ""
echo "=== REBUILD CONTAINER ==="
cd /root/ublochat
docker-compose down 2>/dev/null
docker-compose up -d --build 2>/dev/null || docker compose up -d --build

echo ""
echo "=== CONTAINERS APÓS REBUILD ==="
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"
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
