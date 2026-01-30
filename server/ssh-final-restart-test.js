import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor Supabase');

    const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ewogICJyb2xlIjogImFub24iLAogICJpc3MiOiAic3VwYWJhc2UiLAogICJpYXQiOiAxNzE1MDUwODAwLAogICJleHAiOiAxODcyODE3MjAwCn0.IEHlSEhCYXk6E3QO785siSA5KGdmfWq_UH25z_MLuqA';

    // Restart PostgREST and test
    const cmd = `
echo "=== REINICIANDO POSTGREST ==="
docker service update --force supabase_supabase_rest 2>&1

echo ""
echo "Aguardando 10 segundos..."
sleep 10

echo ""
echo "=== TESTANDO ENDPOINT REST ==="
curl -s -w "\\nHTTP_CODE: %{http_code}" "http://localhost:8000/rest/v1/" \
  -H "apikey: ${anonKey}" \
  -H "Authorization: Bearer ${anonKey}" 2>&1 | head -5

echo ""
echo "=== TESTANDO LOGIN ==="
curl -s -w "\\nHTTP_CODE: %{http_code}" -X POST "http://localhost:8000/auth/v1/token?grant_type=password" \
  -H "apikey: ${anonKey}" \
  -H "Content-Type: application/json" \
  -d '{"email":"ublochat@admin.com","password":"Admin123!@#"}' 2>&1 | head -10

echo ""
echo "=== VERIFICANDO LOGS DO POSTGREST ==="
docker service logs supabase_supabase_rest --tail 15 2>&1 | grep -iE "(error|warning|connected|listening|ready)" || echo "Sem erros críticos"

echo ""
echo "=== TESTE EXTERNO (HTTPS) ==="
curl -s -w "\\nHTTP_CODE: %{http_code}" -k "https://banco.ublochat.com.br/rest/v1/" \
  -H "apikey: ${anonKey}" 2>&1 | head -5

echo ""
echo "=== TESTE COMPLETO ==="
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
