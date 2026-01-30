import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor Supabase');

    const cmd = `
echo "=== 1. BUSCANDO UM USUÁRIO COMUM PARA TESTE ==="
docker exec $(docker ps -q -f name=supabase_db | head -1) psql -U postgres -d postgres -c "
SELECT email FROM auth.users WHERE email != 'ublochat@admin.com' LIMIT 1;
"

echo ""
echo "=== 2. VERIFICANDO TABELA DE MIGRAÇÕES DO AUTH ==="
docker exec $(docker ps -q -f name=supabase_db | head -1) psql -U postgres -d postgres -c "
SELECT * FROM auth.schema_migrations ORDER BY version DESC LIMIT 5;
"

echo ""
echo "=== 3. MONITORANDO LOGS DO POSTGRES (ERROS RECENTES) ==="
docker service logs supabase_supabase_db --tail 20 2>&1 | grep -iE "(error|fail|permission|denied|schema)"

echo ""
echo "=== 4. VERIFICANDO SE O ADMIN TEM ALGUMA CONFIGURAÇÃO ESTRANHA NO AUTH.USERS ==="
docker exec $(docker ps -q -f name=supabase_db | head -1) psql -U postgres -d postgres -c "
SELECT id, email, confirmed_at, is_super_admin, role FROM auth.users WHERE email = 'ublochat@admin.com';
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
