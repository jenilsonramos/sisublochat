import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor Supabase');

    const cmd = `
echo "=== 1. VERIFICANDO POLÍTICAS DE RLS COM DETALHES (Profiles) ==="
docker exec $(docker ps -q -f name=supabase_db | head -1) psql -U postgres -d postgres -c "
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual::text as condition, 
    with_check::text as check_cond
FROM pg_policies 
WHERE tablename = 'profiles';
"

echo ""
echo "=== 2. VERIFICANDO POLÍTICAS DE RLS COM DETALHES (Instances) ==="
docker exec $(docker ps -q -f name=supabase_db | head -1) psql -U postgres -d postgres -c "
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual::text as condition, 
    with_check::text as check_cond
FROM pg_policies 
WHERE tablename = 'instances';
"

echo ""
echo "=== 3. BUSCANDO POR POLÍTICAS QUE PODEM CAUSAR RECURSÃO ===   "
docker exec $(docker ps -q -f name=supabase_db | head -1) psql -U postgres -d postgres -c "
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    qual 
FROM pg_policies 
WHERE qual::text LIKE '%profiles%' OR qual::text LIKE '%role%';
"

echo ""
echo "=== 4. TESTANDO CONSULTA COMO USUÁRIO ANON (Simulando erro de schema) ==="
docker exec $(docker ps -q -f name=supabase_db | head -1) psql -U postgres -d postgres -c "
SET ROLE anon;
SELECT * FROM public.profiles LIMIT 1;
" 2>&1

echo ""
echo "=== 5. VERIFICANDO CONFIGURAÇÃO DO KONG (Headers de Autenticação) ==="
docker service inspect supabase_supabase_kong --format '{{ range .Spec.TaskTemplate.ContainerSpec.Env }}{{ println . }}{{ end }}' | grep -iE "(auth|jwt|apikey)"
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
