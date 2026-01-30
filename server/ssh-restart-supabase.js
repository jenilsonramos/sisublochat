import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor Supabase');

    const cmd = `
echo "=== CONTAINERS SUPABASE ==="
docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep supabase

echo ""
echo "=== REINICIANDO STACK SUPABASE ==="
cd /root/supabase
docker compose restart 2>/dev/null || docker-compose restart

sleep 10

echo ""
echo "=== STATUS APÓS REINÍCIO ==="
docker ps --format "table {{.Names}}\t{{.Status}}" | grep supabase

echo ""
echo "=== TESTANDO POSTGREST ==="
curl -s "http://localhost:3000/" 2>&1 | head -c 200
`;

    conn.exec(cmd, (err, stream) => {
        if (err) throw err;

        let output = '';
        stream.on('data', (data) => { output += data.toString(); });
        stream.stderr.on('data', (data) => { output += data.toString(); });
        stream.on('close', () => {
            console.log(output);
            conn.end();
        });
    });
}).connect({ host: '194.163.189.247', port: 22, username: 'root', password: 'zlPnsbN8y37?Xyaw', readyTimeout: 120000 });
