import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor Supabase');

    // Comprehensive log and config check
    const cmd = `
echo "=============================================="
echo "=== INVESTIGAÇÃO DE ERRO DE SCHEMA E TOKEN ==="
echo "=============================================="

echo ""
echo "=== 1. VERIFICANDO SEGREDOS JWT EM TODOS OS SERVIÇOS ==="
echo "AUTH JWT_SECRET:"
docker service inspect supabase_supabase_auth --format '{{ range .Spec.TaskTemplate.ContainerSpec.Env }}{{ if (slice . 0 11 | eq "JWT_SECRET=") }}{{ println . }}{{ end }}{{ end }}'
echo "REST JWT_SECRET:"
docker service inspect supabase_supabase_rest --format '{{ range .Spec.TaskTemplate.ContainerSpec.Env }}{{ if (slice . 0 21 | eq "PGRST_JWT_SECRET=") }}{{ println . }}{{ end }}{{ end }}'
echo "KONG (proxy) Config check:"
docker service logs supabase_supabase_kong --tail 20 2>&1

echo ""
echo "=== 2. LOGS DO POSTGREST (REST) - BUSCANDO ERRO DE SCHEMA ==="
docker service logs supabase_supabase_rest --tail 50 2>&1 | grep -iE "(error|fatal|schema|failed)"

echo ""
echo "=== 3. VERIFICANDO PERMISSÕES DA ROLE AUTHENTICATOR NOVAMENTE ==="
docker exec $(docker ps -q -f name=supabase_db | head -1) psql -U postgres -d postgres -c "
SELECT rolname, rolcanlogin, rolsuper, rolreplication, rolbypassrls FROM pg_roles WHERE rolname = 'authenticator';
GRANT ALL PRIVILEGES ON SCHEMA public TO authenticator;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO authenticator;
"

echo ""
echo "=== 4. TESTANDO ENDPOINT DE INSTÂNCIAS (Simulando o erro do usuário) ==="
# O erro "Token não fornecido" sugere que o Kong ou o backend não está recebendo o header Authorization
curl -s -i "http://localhost:8000/rest/v1/instances" -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ewogICJyb2xlIjogImFub24iLAogICJpc3MiOiAic3VwYWJhc2UiLAogICJpYXQiOiAxNzE1MDUwODAwLAogICJleHAiOiAxODcyODE3MjAwCn0.IEHlSEhCYXk6E3QO785siSA5KGdmfWq_UH25z_MLuqA"

echo ""
echo "=== 5. VERIFICANDO CONEXÃO DIRETA AO BANCO PELO REST ==="
# Pegar a URL de conexão do REST
docker service inspect supabase_supabase_rest --format '{{ range .Spec.TaskTemplate.ContainerSpec.Env }}{{ println . }}{{ end }}' | grep DB_URI
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
