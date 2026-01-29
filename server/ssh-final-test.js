import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor Supabase');

    // Final test of PostgREST
    const cmd = `
echo "=== REINICIANDO POSTGREST ==="
docker restart $(docker ps -q -f name=supabase_rest) 2>/dev/null

sleep 5

echo ""
echo "=== TESTANDO ENDPOINT ROOT ==="
curl -s "http://localhost:3000/" 2>&1 | grep -o '"swagger":"[^"]*"' || echo "Schema loading..."

echo ""
echo "=== TESTANDO ACESSO A PROFILES ==="
curl -s "http://localhost:3000/profiles?select=email&limit=1" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q" 2>&1

echo ""
echo "=== STATUS POSTGREST ==="
docker logs $(docker ps -q -f name=supabase_rest) --tail 10 2>&1
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
