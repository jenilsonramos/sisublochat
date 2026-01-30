import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor Supabase');

    // Restart PostgREST and test
    const cmd = `
echo "=== REINICIANDO POSTGREST ==="
docker restart $(docker ps -q -f name=rest) 2>&1

sleep 5

echo ""
echo "=== TESTANDO ENDPOINT ROOT ==="
curl -s http://localhost:3000/ 2>/dev/null | head -c 200

echo ""
echo ""
echo "=== TESTANDO VIA KONG (PORTA 8000) ==="
curl -s http://localhost:8000/rest/v1/ 2>/dev/null | head -c 200

echo ""
echo ""
echo "=== TESTANDO API EXTERNA ==="
curl -s -k https://banco.ublochat.com.br/rest/v1/ 2>/dev/null | head -c 300

echo ""
echo "TESTE COMPLETO"
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
