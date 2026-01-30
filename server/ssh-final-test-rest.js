import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor Supabase');

    const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ewogICJyb2xlIjogImFub24iLAogICJpc3MiOiAic3VwYWJhc2UiLAogICJpYXQiOiAxNzE1MDUwODAwLAogICJleHAiOiAxODcyODE3MjAwCn0.IEHlSEhCYXk6E3QO785siSA5KGdmfWq_UH25z_MLuqA';

    // Final test of the REST endpoint
    const cmd = `
echo "=== TESTE FINAL DO REST ENDPOINT ==="

echo ""
echo "1. Testando via Kong (porta 8000):"
RESPONSE=$(curl -s -w "\\n___HTTP_CODE___%{http_code}" "http://localhost:8000/rest/v1/" -H "apikey: ${anonKey}" -H "Authorization: Bearer ${anonKey}" 2>&1)
echo "$RESPONSE" | head -20

echo ""
echo "2. Verificando se há erros nos logs do REST:"
docker service logs supabase_supabase_rest --tail 30 2>&1 | grep -iE "(error|fail|unable)" || echo "✅ Nenhum erro encontrado nos logs!"

echo ""
echo "3. Testando endpoint externo (via traefik):"
curl -s -w "\\nHTTP_CODE: %{http_code}" -k "https://banco.ublochat.com.br/rest/v1/" -H "apikey: ${anonKey}" 2>&1 | head -5

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
