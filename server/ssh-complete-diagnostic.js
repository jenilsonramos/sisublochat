import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor Supabase');

    const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ewogICJyb2xlIjogImFub24iLAogICJpc3MiOiAic3VwYWJhc2UiLAogICJpYXQiOiAxNzE1MDUwODAwLAogICJleHAiOiAxODcyODE3MjAwCn0.IEHlSEhCYXk6E3QO785siSA5KGdmfWq_UH25z_MLuqA';

    // Complete diagnostic of all services
    const cmd = `
echo "=============================================="
echo "=== DIAGNÓSTICO COMPLETO DO ERRO DE SCHEMA ==="
echo "=============================================="

echo ""
echo "=== 1. STATUS DE TODOS OS SERVIÇOS SUPABASE ==="
docker service ls 2>/dev/null | grep -i supa

echo ""
echo "=== 2. TESTANDO ENDPOINT DE LOGIN (GoTrue Auth) ==="
curl -s -w "\\n___HTTP: %{http_code}___" -X POST "http://localhost:8000/auth/v1/token?grant_type=password" \
  -H "apikey: ${anonKey}" \
  -H "Content-Type: application/json" \
  -d '{"email":"ublochat@admin.com","password":"Admin123!@#"}' 2>&1 | tail -20

echo ""
echo "=== 3. LOGS DO SERVIÇO AUTH (GoTrue) - últimas 30 linhas ==="
docker service logs supabase_supabase_auth --tail 30 2>&1 | tail -20

echo ""
echo "=== 4. LOGS DO SERVIÇO REST (PostgREST) - últimas 30 linhas ==="
docker service logs supabase_supabase_rest --tail 30 2>&1 | tail -20

echo ""
echo "=== 5. LOGS DO KONG (API Gateway) - últimas 20 linhas ==="
docker service logs supabase_supabase_kong --tail 20 2>&1 | tail -15

echo ""
echo "=== 6. TESTANDO QUERY DIRETA NO DB COMO AUTHENTICATOR ==="
docker exec $(docker ps -q -f name=supabase_db | head -1) psql -U postgres -d postgres -c "
SET ROLE authenticator;
SET request.jwt.claims = '{\"role\": \"anon\", \"email\": \"test@test.com\"}';
SELECT COUNT(*) as total_profiles FROM public.profiles LIMIT 1;
" 2>&1

echo ""
echo "=== 7. VERIFICANDO SE HÁ ERROS DE RLS ==="
docker exec $(docker ps -q -f name=supabase_db | head -1) psql -U postgres -d postgres -c "
SELECT schemaname, tablename, policyname, permissive, cmd 
FROM pg_policies 
WHERE tablename IN ('profiles', 'admin_access', 'system_settings', 'admin_settings', 'subscriptions', 'plans')
ORDER BY tablename;
" 2>&1

echo ""
echo "=== DIAGNÓSTICO COMPLETO ==="
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
