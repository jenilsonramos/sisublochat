import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor Supabase');

    // Restart PostgREST service and test
    const cmd = `
echo "=== REINICIANDO SERVIÇO POSTGREST ==="
docker service update --force supabase_supabase_rest 2>&1

echo ""
echo "=== AGUARDANDO 10 SEGUNDOS ==="
sleep 10

echo ""
echo "=== VERIFICANDO STATUS DO SERVIÇO ==="
docker service ps supabase_supabase_rest 2>&1 | head -5

echo ""
echo "=== TESTANDO ENDPOINT REST ==="
curl -s -w "\\nHTTP_CODE: %{http_code}" "http://localhost:8000/rest/v1/" -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ewogICJyb2xlIjogImFub24iLAogICJpc3MiOiAic3VwYWJhc2UiLAogICJpYXQiOiAxNzE1MDUwODAwLAogICJleHAiOiAxODcyODE3MjAwCn0.IEHlSEhCYXk6E3QO785siSA5KGdmfWq_UH25z_MLuqA" 2>&1 | head -10

echo ""
echo "=== VERIFICANDO LOGS DO REST ==="
docker service logs supabase_supabase_rest --tail 20 2>&1 | grep -E "(error|Error|ERROR|connected|ready|listening)" || echo "Verificar logs completos"

echo ""
echo "RESTART COMPLETO"
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
