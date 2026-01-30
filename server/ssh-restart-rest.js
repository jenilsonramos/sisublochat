import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor Supabase');

    // Multiple diagnostic commands
    const cmd = `
echo "=== ALL CONTAINERS ==="
docker ps --format "{{.Names}}" | grep -i supa

echo ""
echo "=== TESTING REST DIRECTLY ==="
curl -s http://localhost:3000/ | head -c 500 || echo "CURL FAILED"

echo ""
echo "=== CHECKING POSTGREST CONTAINER STATUS ==="
docker ps -a | grep -i rest

echo ""  
echo "=== LET'S RESTART POSTGREST ==="
docker restart $(docker ps -q -f name=rest) 2>&1

sleep 3

echo ""
echo "=== TEST AFTER RESTART ==="
curl -s http://localhost:3000/ | head -c 500 || echo "CURL FAILED"
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
