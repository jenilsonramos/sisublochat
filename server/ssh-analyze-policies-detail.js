import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor Supabase');

    // Get ALL policies and check for broken function references
    const sql = `
-- 1. Listar TODAS as políticas com seus quals completos
SELECT tablename, policyname, qual::text as policy_condition
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 2. Verificar se alguma política tem erro de sintaxe ou função inexistente
-- Testando como a role anon consegue acessar system_settings
SET ROLE anon;
BEGIN;
SELECT COUNT(*) as test_system_settings FROM public.system_settings;
ROLLBACK;
RESET ROLE;

-- 3. Testando como authenticator consegue consultar o schema
SET ROLE authenticator;
SET request.jwt.claims = '{}';  -- JWT vazio (como anon)
BEGIN;
SELECT COUNT(*) as test_profiles FROM public.profiles LIMIT 1;
ROLLBACK;
RESET ROLE;
`;

    const base64Sql = Buffer.from(sql).toString('base64');
    const cmd = `echo "${base64Sql}" | base64 -d | docker exec -i $(docker ps -q -f name=supabase_db | head -1) psql -U postgres -d postgres 2>&1`;

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
            console.log('=== ANÁLISE DETALHADA DAS POLÍTICAS ===');
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
