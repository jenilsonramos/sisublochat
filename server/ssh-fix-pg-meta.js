import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor Supabase');

    // Fix pg_meta and restart all related services
    const sql = `
-- Garantir que supabase_admin tenha todas as permissões necessárias
ALTER ROLE supabase_admin WITH LOGIN SUPERUSER CREATEROLE CREATEDB REPLICATION BYPASSRLS;
ALTER ROLE supabase_admin WITH PASSWORD 'e52f57838865b7d25b4b8a161b3d3efa';

-- Garantir acesso a todos os schemas
GRANT ALL PRIVILEGES ON DATABASE postgres TO supabase_admin;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO supabase_admin;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA storage TO supabase_admin;
GRANT ALL PRIVILEGES ON SCHEMA public TO supabase_admin;
GRANT ALL PRIVILEGES ON SCHEMA storage TO supabase_admin;
GRANT ALL PRIVILEGES ON SCHEMA information_schema TO supabase_admin;
GRANT ALL PRIVILEGES ON SCHEMA pg_catalog TO supabase_admin;

-- Verificar que o usuário pode consultar pg_policies (usado pelo Studio)
GRANT SELECT ON pg_policies TO supabase_admin;
GRANT SELECT ON pg_policies TO PUBLIC;

-- Verificar roles
SELECT rolname, rolsuper, rolcanlogin, rolbypassrls FROM pg_roles WHERE rolname IN ('supabase_admin', 'authenticator', 'anon', 'authenticated', 'service_role');

-- Notify schema reload
NOTIFY pgrst, 'reload schema';

SELECT 'PERMISSÕES DO SUPABASE_ADMIN CORRIGIDAS!' AS status;
`;

    const base64Sql = Buffer.from(sql).toString('base64');
    const cmd = `
echo "=== CORRIGINDO PERMISSÕES DO SUPABASE_ADMIN ==="
echo "${base64Sql}" | base64 -d | docker exec -i $(docker ps -q -f name=supabase_db | head -1) psql -U postgres -d postgres 2>&1

echo ""
echo "=== REINICIANDO SERVIÇOS CRÍTICOS ==="
docker service update --force supabase_supabase_meta 2>&1
sleep 3
docker service update --force supabase_supabase_studio 2>&1
sleep 3
docker service update --force supabase_supabase_rest 2>&1

echo ""
echo "Aguardando 10 segundos para os serviços reiniciarem..."
sleep 10

echo ""
echo "=== STATUS DOS SERVIÇOS ==="
docker service ls | grep -i supa | head -10

echo ""
echo "=== TESTANDO PG_META ==="
curl -s http://localhost:8080/health 2>&1 || echo "Endpoint health não disponível"

echo ""
echo "=== CORREÇÃO COMPLETA ==="
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
