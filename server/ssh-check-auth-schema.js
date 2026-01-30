import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor Supabase');

    const cmd = `
echo "=== 1. VERIFICANDO TABELAS NO SCHEMA auth ==="
docker exec $(docker ps -q -f name=supabase_db | head -1) psql -U postgres -d postgres -c "\\dt auth.*"

echo ""
echo "=== 2. VERIFICANDO CONTEÚDO DO ERRO 500 ==="
cat /tmp/auth_error_body.json

echo ""
echo "=== 3. TESTANDO SE supabase_auth_admin PODE LER auth.users ==="
docker exec $(docker ps -q -f name=supabase_db | head -1) psql -U supabase_auth_admin -d postgres -c "SELECT count(*) FROM auth.users;" || echo "ERRO: Sem acesso a auth.users"

echo ""
echo "=== 4. VERIFICANDO SEARCH_PATH DA ROLE supabase_auth_admin ==="
docker exec $(docker ps -q -f name=supabase_db | head -1) psql -U postgres -d postgres -c "SELECT rolname, rolconfig FROM pg_roles WHERE rolname = 'supabase_auth_admin';"

echo ""
echo "=== 5. GARANTINDO PROPRIEDADE E ACESSO AO SCHEMA auth ==="
docker exec $(docker ps -q -f name=supabase_db | head -1) psql -U postgres -d postgres -c "
GRANT USAGE ON SCHEMA auth TO supabase_auth_admin;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA auth TO supabase_auth_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA auth TO supabase_auth_admin;
ALTER ROLE supabase_auth_admin SET search_path = auth, public;
"
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
