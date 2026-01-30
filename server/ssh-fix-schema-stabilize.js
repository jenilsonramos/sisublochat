import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor Supabase');

    const sql = `
-- ============================================
-- ESTABILIZAÇÃO DE BANCO - CORREÇÃO DE SCHEMA
-- ============================================

-- 1. DESATIVAR RLS em tabelas que causam recursão durante o login
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.instances DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions DISABLE ROW LEVEL SECURITY;

-- 2. Garantir que Tabelas de Sistema não tenham RLS
ALTER TABLE IF EXISTS public.admin_access DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.system_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.plans DISABLE ROW LEVEL SECURITY;

-- 3. REMOVER FUNÇÕES QUE PODEM CAUSAR ERROS DE PRIVILÉGIOS NO SCHEMA
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;
DROP FUNCTION IF EXISTS public.check_admin_access() CASCADE;

-- 4. CONCEDER PERMISSÕES TOTAIS PARA AS ROLES DE AUTENTICAÇÃO
-- Isso garante que o PostgREST não reclame de schema ao tentar autenticar
GRANT ALL PRIVILEGES ON SCHEMA public TO authenticator, anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO authenticator, anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO authenticator, anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO authenticator, anon, authenticated, service_role;

-- 5. Garantir acesso ao schema auth para introspecção se necessário
GRANT USAGE ON SCHEMA auth TO authenticator, anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA auth TO authenticator;

-- 6. Forçar recarregamento do PostgREST
NOTIFY pgrst, 'reload schema';

SELECT 'DATABASE ESTABILIZADO! RLS DESATIVADO TEMPORARIAMENTE.' as result;
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
            console.log('=== RESULTADO ESTABILIZAÇÃO DB ===');
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
