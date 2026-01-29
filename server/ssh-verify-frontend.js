import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor de Produção');

    const cmd = `
echo "=== LOGS DO CONTAINER UBLOCHAT ==="
docker logs ublochat --tail 50 2>&1

echo ""
echo "=== TESTANDO PORTA DO FRONTEND ==="
curl -sI http://localhost:80 2>&1 | head -10

echo ""
echo "=== TESTANDO ROTA /INSTANCES ==="
curl -s http://localhost:80/instances 2>&1 | head -20
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
