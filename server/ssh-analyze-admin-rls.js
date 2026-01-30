import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor Supabase');

    const cmd = `
echo "=== 1. DADOS DO USUÁRIO ADMINISTRADOR NO BANCO ==="
docker exec $(docker ps -q -f name=supabase_db | head -1) psql -U postgres -d postgres -c "
SELECT id, email, role, status FROM public.profiles WHERE role = 'ADMIN' OR email = 'ublochat@admin.com';
"

echo ""
echo "=== 2. POLÍTICAS DE RLS NA TABELA PROFILES ==="
docker exec $(docker ps -q -f name=supabase_db | head -1) psql -U postgres -d postgres -c "
SELECT policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'profiles';
"

echo ""
echo "=== 3. POLÍTICAS DE RLS NA TABELA INSTANCES ==="
docker exec $(docker ps -q -f name=supabase_db | head -1) psql -U postgres -d postgres -c "
SELECT policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'instances';
"

echo ""
echo "=== 4. BUSCANDO FUNÇÕES DE VERIFICAÇÃO DE ROLE ==="
docker exec $(docker ps -q -f name=supabase_db | head -1) psql -U postgres -d postgres -c "
SELECT proname, prosrc 
FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  AND (proname LIKE '%admin%' OR proname LIKE '%role%');
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
