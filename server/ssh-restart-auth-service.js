import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor Supabase');

    // Get more detailed logs and restart auth service
    const cmd = `
echo "=== VERIFICANDO SE AUTH ESTÁ RODANDO ==="
docker service ls | grep auth

echo ""
echo "=== LOGS MAIS RECENTES DO AUTH ==="
docker service logs supabase_supabase_auth --tail 50 --no-trunc 2>&1 | grep -E "(error|Error|ERROR|fatal|Fatal|panic|level)" | tail -30

echo ""
echo "=== VERIFICANDO SE USUARIO ADMIN EXISTE NO AUTH.USERS ==="
docker exec $(docker ps -q -f name=supabase_db | head -1) psql -U postgres -d postgres -c "
SELECT id, email, role, created_at FROM auth.users WHERE email = 'ublochat@admin.com';
" 2>&1

echo ""
echo "=== REINICIANDO SERVIÇO AUTH ==="
docker service update --force supabase_supabase_auth 2>&1

echo ""
echo "Aguardando 15 segundos..."
sleep 15

echo ""
echo "=== TESTANDO LOGIN APÓS RESTART ==="
curl -s -w "\\nHTTP: %{http_code}" -X POST "http://localhost:8000/auth/v1/token?grant_type=password" \
  -H "Content-Type: application/json" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ewogICJyb2xlIjogImFub24iLAogICJpc3MiOiAic3VwYWJhc2UiLAogICJpYXQiOiAxNzE1MDUwODAwLAogICJleHAiOiAxODcyODE3MjAwCn0.IEHlSEhCYXk6E3QO785siSA5KGdmfWq_UH25z_MLuqA" \
  -d '{"email":"ublochat@admin.com","password":"Admin123!@#"}' 2>&1 | head -20

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
