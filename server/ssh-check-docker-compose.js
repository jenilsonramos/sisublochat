import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor de Produção');

    const cmd = `
echo "=== DOCKER COMPOSE ==="
cat /root/ublochat/docker-compose.yml 2>/dev/null || cat /root/docker-compose.yml 2>/dev/null || echo "No docker-compose found"

echo ""
echo "=== LISTA CONTAINERS ==="
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Ports}}"

echo ""
echo "=== NGINX PROXY CONFIG ==="
docker exec nginx-proxy cat /etc/nginx/conf.d/default.conf 2>/dev/null | head -60 || echo "No nginx-proxy container"
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
