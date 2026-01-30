import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor Supabase');

    // Test with API key and check schema loading
    const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ewogICJyb2xlIjogImFub24iLAogICJpc3MiOiAic3VwYWJhc2UiLAogICJpYXQiOiAxNzE1MDUwODAwLAogICJleHAiOiAxODcyODE3MjAwCn0.IEHlSEhCYXk6E3QO785siSA5KGdmfWq_UH25z_MLuqA';

    const cmd = `
echo "=== TESTE COM API KEY (via Kong) ==="
curl -s -H "apikey: ${anonKey}" -H "Authorization: Bearer ${anonKey}" http://localhost:8000/rest/v1/ 2>&1 | head -c 500

echo ""
echo ""
echo "=== TESTE EXTERNO COM API KEY ==="
curl -s -k -H "apikey: ${anonKey}" -H "Authorization: Bearer ${anonKey}" https://banco.ublochat.com.br/rest/v1/ 2>&1 | head -c 500

echo ""
echo ""
echo "=== VERIFICANDO LOGS DO POSTGREST POR ERROS ==="
docker logs $(docker ps -q -f name=rest) 2>&1 | tail -20 | grep -i error || echo "Nenhum erro encontrado nos logs"

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
