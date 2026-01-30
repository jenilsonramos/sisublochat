import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor Supabase');

    // Force LOGIN and check connection again
    const cmd = `
echo "=== 1. FORÇANDO LOGIN NA ROLE supabase_auth_admin ==="
docker exec $(docker ps -q -f name=supabase_db | head -1) psql -U postgres -d postgres -c "
ALTER ROLE supabase_auth_admin WITH LOGIN PASSWORD 'e52f57838865b7d25b4b8a161b3d3efa';
ALTER ROLE supabase_storage_admin WITH LOGIN PASSWORD 'e52f57838865b7d25b4b8a161b3d3efa';
GRANT CONNECT ON DATABASE postgres TO supabase_auth_admin;
"

echo ""
echo "=== 2. VERIFICANDO STATUS DAS ROLES ==="
docker exec $(docker ps -q -f name=supabase_db | head -1) psql -U postgres -d postgres -c "
SELECT rolname, rolcanlogin, rolsuper FROM pg_roles WHERE rolname IN ('supabase_auth_admin', 'supabase_storage_admin');
"

echo ""
echo "=== 3. TESTANDO CONEXÃO DIRETA COM supabase_auth_admin ==="
docker exec $(docker ps -q -f name=supabase_db | head -1) psql -U supabase_auth_admin -d postgres -c "SELECT 'Conexão OK' as status;" || echo "ERRO: supabase_auth_admin ainda não consegue logar!"

echo ""
echo "=== 4. REINICIANDO SERVIÇO AUTH (FORÇADO) ==="
docker service update --force supabase_supabase_auth 2>&1
sleep 5

echo ""
echo "=== 5. CAPTURANDO LOGS DE ERRO DO AUTH (ÚLTIMAS 30 LINHAS) ==="
docker service logs supabase_supabase_auth --tail 30 2>&1
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
