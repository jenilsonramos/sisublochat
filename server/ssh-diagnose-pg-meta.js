import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor Supabase');

    // Check pg_meta service - this is what Supabase Studio uses!
    const cmd = `
echo "=============================================="
echo "=== DIAGNÓSTICO DO PG_META (Supabase Studio) ==="
echo "=============================================="

echo ""
echo "=== 1. STATUS DO SERVIÇO PG_META ==="
docker service ps supabase_supabase_meta 2>&1 | head -5

echo ""
echo "=== 2. LOGS DO PG_META (últimas 50 linhas) ==="
docker service logs supabase_supabase_meta --tail 50 2>&1

echo ""
echo "=== 3. TESTANDO CONEXÃO DO PG_META ==="
docker exec $(docker ps -q -f name=supabase_db | head -1) psql -U supabase_admin -d postgres -c "SELECT current_user, current_database();" 2>&1

echo ""
echo "=== 4. VERIFICANDO A ROLE supabase_admin ==="
docker exec $(docker ps -q -f name=supabase_db | head -1) psql -U postgres -d postgres -c "
SELECT rolname, rolcanlogin, rolsuper FROM pg_roles WHERE rolname = 'supabase_admin';
" 2>&1

echo ""
echo "=== 5. TESTANDO ENDPOINT DO PG_META DIRETAMENTE ==="
curl -s http://localhost:8080/tables 2>&1 | head -c 500

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
