import { Client } from 'ssh2';

const conn = new Client();

// Correct ANON KEY from user
const correctAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ewogICJyb2xlIjogImFub24iLAogICJpc3MiOiAic3VwYWJhc2UiLAogICJpYXQiOiAxNzE1MDUwODAwLAogICJleHAiOiAxODcyODE3MjAwCn0.IEHlSEhCYXk6E3QO785siSA5KGdmfWq_UH25z_MLuqA';

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor Supabase');

    const cmd = `
echo "=== TESTANDO CHAVE ANON CORRETA ==="
curl -s "https://banco.ublochat.com.br/rest/v1/admin_access?select=email" \
  -H "apikey: ${correctAnonKey}" \
  -H "Authorization: Bearer ${correctAnonKey}" 2>&1

echo ""
echo "=== TESTANDO ENDPOINT SWAGGER ==="
curl -s "https://banco.ublochat.com.br/rest/v1/" 2>&1 | head -c 200
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
