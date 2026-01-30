import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor Supabase');

    const cmd = `
echo "=== REINICIANDO POSTGREST ==="
docker restart $(docker ps -q -f name=supabase_rest)

sleep 5

echo ""
echo "=== TESTANDO ENDPOINT SWAGGER ==="
curl -s "http://localhost:3000/" 2>&1 | grep -o '"swagger":"[^"]*"' || echo "Erro no swagger"

echo ""
echo "=== LOGS DO POSTGREST ==="
docker logs $(docker ps -q -f name=supabase_rest) 2>&1 | tail -20
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
