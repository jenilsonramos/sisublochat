import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor Supabase');

    // Check for errors in auth logs and database state
    const cmd = `
echo "=== LOGS RECENTES DO AUTH ==="
docker service logs supabase_supabase_auth --tail 50 --no-trunc 2>&1

echo ""
echo "=== VERIFICANDO TABELAS DO SCHEMA AUTH ==="
docker exec $(docker ps -q -f name=supabase_db | head -1) psql -U postgres -d postgres -c "\\dt auth.*"

echo ""
echo "=== VERIFICANDO EXTENSÕES ==="
docker exec $(docker ps -q -f name=supabase_db | head -1) psql -U postgres -d postgres -c "SELECT * FROM pg_extension WHERE extname IN ('pgcrypto', 'uuid-ossp');"

echo ""
echo "=== TESTANDO LOGIN DETALHADO (verificando corpo da resposta) ==="
curl -s -D - -X POST "http://localhost:8000/auth/v1/token?grant_type=password" \
  -H "Content-Type: application/json" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ewogICJyb2xlIjogImFub24iLAogICJpc3MiOiAic3VwYWJhc2UiLAogICJpYXQiOiAxNzE1MDUwODAwLAogICJleHAiOiAxODcyODE3MjAwCn0.IEHlSEhCYXk6E3QO785siSA5KGdmfWq_UH25z_MLuqA" \
  -d '{"email":"ublochat@admin.com","password":"Admin123!@#"}' 2>&1 | head -30
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
