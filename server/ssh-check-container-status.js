import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor de Produção');

    const cmd = `
echo "=== CONTAINERS ATUAIS ==="
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "=== LOGS DO CONTAINER UBLOCHAT ==="
docker logs ublochat --tail 30 2>&1

echo ""
echo "=== VERIFICANDO DIST NO CONTAINER ==="
docker exec ublochat ls -la /usr/share/nginx/html 2>/dev/null | head -15 || docker exec ublochat ls -la /app/dist 2>/dev/null | head -15

echo ""
echo "=== TESTANDO CONEXÃO LOCAL ==="
curl -s http://localhost:80/ 2>&1 | head -20 || echo "Port 80 not responding"
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
