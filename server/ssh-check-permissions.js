import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor Supabase');

    const cmd = `
docker exec $(docker ps -q -f name=supabase_db) psql -U postgres -d postgres << 'QUERY'
-- Verificar permissões do role anon no schema public
SELECT grantee, privilege_type, table_name 
FROM information_schema.table_privileges 
WHERE grantee = 'anon' 
AND table_schema = 'public'
LIMIT 30;

-- Verificar se anon pode fazer a introspecção
SET ROLE anon;
SELECT tablename FROM pg_tables WHERE schemaname = 'public' LIMIT 5;
RESET ROLE;

-- Verificar se há triggers problemáticos
SELECT trigger_name, event_object_table, action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
LIMIT 10;

-- Verificar grants no schema public
SELECT nspname, nspacl FROM pg_namespace WHERE nspname = 'public';
QUERY

echo ""
echo "=== REINICIANDO POSTGREST SWARM SERVICE ==="
docker service update --force supabase_supabase_rest 2>&1 | head -5

sleep 10

echo ""
echo "=== TESTANDO APÓS REINÍCIO ==="
curl -s "http://localhost:3000/" 2>&1 | head -c 200
`;

    conn.exec(cmd, (err, stream) => {
        if (err) throw err;

        let output = '';
        stream.on('data', (data) => { output += data.toString(); });
        stream.stderr.on('data', (data) => { output += data.toString(); });
        stream.on('close', () => {
            console.log(output);
            conn.end();
        });
    });
}).connect({ host: '194.163.189.247', port: 22, username: 'root', password: 'zlPnsbN8y37?Xyaw', readyTimeout: 120000 });
