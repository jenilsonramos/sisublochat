import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor Supabase');

    // Check PostgREST logs for errors
    const cmd = `
echo "=== ÚLTIMOS LOGS DO POSTGREST (PROCURANDO ERROS) ==="
docker logs $(docker ps -q -f name=supabase_rest) 2>&1 | tail -100 | grep -i "error\\|fail\\|schema" | tail -20

echo ""
echo "=== DETALHES DO ÚLTIMO ERRO ==="
docker logs $(docker ps -q -f name=supabase_rest) 2>&1 | tail -50

echo ""
echo "=== VERIFICANDO RLS EM PROFILES ==="
psql_cmd="SELECT tablename, policyname, cmd, qual FROM pg_policies WHERE tablename = 'profiles';"
docker exec $(docker ps -q -f name=supabase_db) psql -U postgres -d postgres -c "$psql_cmd"

echo ""
echo "=== TESTANDO QUERY ADMIN_ACCESS DIRETAMENTE ==="
docker exec $(docker ps -q -f name=supabase_db) psql -U postgres -d postgres -c "SELECT * FROM public.admin_access;"
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
