import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor Supabase');

    // Check GoTrue auth service logs
    const cmd = `
echo "=============================================="
echo "=== LOGS DO GOTRUE AUTH SERVICE ==="
echo "=============================================="

echo ""
echo "=== LOGS DO SERVIÇO AUTH (últimas 100 linhas) ==="
docker service logs supabase_supabase_auth --tail 100 2>&1

echo ""
echo "=== TESTANDO ENDPOINT AUTH DIRETAMENTE ==="
curl -s -w "\\nHTTP: %{http_code}" -X POST "http://localhost:9999/token?grant_type=password" \
  -H "Content-Type: application/json" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ewogICJyb2xlIjogImFub24iLAogICJpc3MiOiAic3VwYWJhc2UiLAogICJpYXQiOiAxNzE1MDUwODAwLAogICJleHAiOiAxODcyODE3MjAwCn0.IEHlSEhCYXk6E3QO785siSA5KGdmfWq_UH25z_MLuqA" \
  -d '{"email":"ublochat@admin.com","password":"Admin123!@#"}' 2>&1

echo ""
echo "=== STATUS DO SERVIÇO AUTH ==="
docker service ps supabase_supabase_auth 2>&1 | head -5

echo ""
echo "DIAGNÓSTICO COMPLETO"
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
