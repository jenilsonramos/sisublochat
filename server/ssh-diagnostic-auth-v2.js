import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor Supabase');

    // Check logs and user existence
    const cmd = `
echo "=== 1. VERIFICANDO ROLES NOVAMENTE ==="
docker exec $(docker ps -q -f name=supabase_db | head -1) psql -U postgres -d postgres -c "SELECT rolname, rolcanlogin, rolsuper FROM pg_roles WHERE rolname IN ('supabase_auth_admin', 'supabase_storage_admin');"

echo ""
echo "=== 2. VERIFICANDO USUÁRIO ADMIN NO AUTH.USERS ==="
docker exec $(docker ps -q -f name=supabase_db | head -1) psql -U postgres -d postgres -c "SELECT id, email, created_at, last_sign_in_at FROM auth.users WHERE email = 'ublochat@admin.com';"

echo ""
echo "=== 3. LOGS DO GOTRUE AUTH (últimas 20 linhas) ==="
docker service logs supabase_supabase_auth --tail 20 --no-trunc 2>&1

echo ""
echo "=== 4. TESTANDO RESOLUÇÃO DNS INTERNA (KONG -> AUTH) ==="
docker exec $(docker ps -q -f name=supabase_kong | head -1) ping -c 1 supabase_auth || echo "Falha ao encontrar supabase_auth"

echo ""
echo "=== 5. TESTANDO CONEXÃO EXTERNA ==="
curl -k -s -o /dev/null -w "%{http_code}" https://banco.ublochat.com.br/auth/v1/token?grant_type=password || echo "Falha externa"
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
