import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor Supabase');

    // Force fix for auth roles
    const sql = `
-- Fix supabase_auth_admin
ALTER ROLE supabase_auth_admin WITH LOGIN PASSWORD 'e52f57838865b7d25b4b8a161b3d3efa' SUPERUSER;
GRANT CONNECT ON DATABASE postgres TO supabase_auth_admin;

-- Fix supabase_storage_admin (just in case)
ALTER ROLE supabase_storage_admin WITH LOGIN PASSWORD 'e52f57838865b7d25b4b8a161b3d3efa' SUPERUSER;
GRANT CONNECT ON DATABASE postgres TO supabase_storage_admin;

-- Verify
SELECT rolname, rolcanlogin, rolsuper FROM pg_roles WHERE rolname IN ('supabase_auth_admin', 'supabase_storage_admin');
`;

    const base64Sql = Buffer.from(sql).toString('base64');
    const cmd = `
echo "=== ATUALIZANDO ROLES DE SERVIÇO ==="
echo "${base64Sql}" | base64 -d | docker exec -i $(docker ps -q -f name=supabase_db | head -1) psql -U postgres -d postgres 2>&1

echo ""
echo "=== REINICIANDO SERVIÇOS AUTH E STORAGE ==="
docker service update --force supabase_supabase_auth 2>&1
docker service update --force supabase_supabase_storage 2>&1

echo ""
echo "Aguardando 10 segundos..."
sleep 10

echo "=== TESTE DE LOGIN INTERNO ==="
curl -s -o /dev/null -w "%{http_code}" -X POST "http://localhost:8000/auth/v1/token?grant_type=password" \
  -H "Content-Type: application/json" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ewogICJyb2xlIjogImFub24iLAogICJpc3MiOiAic3VwYWJhc2UiLAogICJpYXQiOiAxNzE1MDUwODAwLAogICJleHAiOiAxODcyODE3MjAwCn0.IEHlSEhCYXk6E3QO785siSA5KGdmfWq_UH25z_MLuqA" \
  -d '{"email":"ublochat@admin.com","password":"Admin123!@#"}' 2>&1 || echo "Curl falhou"
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
