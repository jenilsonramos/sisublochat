import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor de Produção');

    const cmd = `
echo "=== TODOS OS CONTAINERS INCLUINDO PARADOS ==="
docker ps -a --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "=== DOCKER-COMPOSE DO PROJETO ==="
cd /root/ublochat && cat docker-compose.yml 2>/dev/null || cat docker-compose.yaml 2>/dev/null

echo ""
echo "=== RECONSTRUÇÃO FORÇADA ==="
cd /root/ublochat && docker compose build --no-cache && docker compose up -d
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
