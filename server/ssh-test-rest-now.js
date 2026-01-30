import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor Supabase');

    // Test PostgREST deeply
    const cmd = `
echo "=== TESTING REST ENDPOINT NOW ==="
curl -s http://localhost:3000/ 2>&1 | head -c 1000

echo ""
echo ""
echo "=== CHECKING POSTGREST LOGS AFTER RESTART ==="
docker logs $(docker ps -q -f name=rest) --tail 30 2>&1

echo ""
echo "=== TESTING KONG API GATEWAY ==="
curl -s http://localhost:8000/rest/v1/ 2>&1 | head -c 500
`;

    conn.exec(cmd, (err, stream) => {
        if (err) {
            console.error('Erro:', err);
            conn.end();
            return;
        }

        let output = '';
        stream.on('data', (data) => {
            output += data.toString();
        });
        stream.stderr.on('data', (data) => {
            output += data.toString();
        });

        stream.on('close', () => {
            console.log(output);
            conn.end();
        });
    });
});

conn.on('error', (err) => {
    console.error('Erro SSH:', err.message);
});

conn.connect({
    host: '194.163.189.247',
    port: 22,
    username: 'root',
    password: 'zlPnsbN8y37?Xyaw',
    readyTimeout: 120000
});
