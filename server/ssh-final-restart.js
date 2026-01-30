import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor Supabase');

    const cmd = `
echo "=== REINICIANDO SERVIÇO POSTGREST ==="
docker service update --force supabase_supabase_rest

sleep 10

echo ""
echo "=== TESTANDO SWAGGER ==="
result=$(curl -s "http://localhost:3000/" 2>&1)
if echo "$result" | grep -q '"swagger":"2.0"'; then
    echo "✅ Schema carregado com sucesso!"
    echo "$result" | grep -o '"swagger":"[^"]*"'
else
    echo "❌ Ainda com erro:"
    echo "$result" | head -c 300
fi

echo ""
echo "=== TESTANDO QUERY EM ADMIN_ACCESS ==="
curl -s "http://localhost:3000/admin_access?select=email" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ewogICJyb2xlIjogImFub24iLAogICJpc3MiOiAic3VwYWJhc2UiLAogICJpYXQiOiAxNzE1MDUwODAwLAogICJleHAiOiAxODcyODE3MjAwCn0.IEHlSEhCYXk6E3QO785siSA5KGdmfWq_UH25z_MLuqA" 2>&1
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
