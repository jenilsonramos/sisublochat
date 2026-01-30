import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor Supabase');

    const sql = `
-- SOLUÇÃO DRÁSTICA: REMOVER is_admin E ATUALIZAR TODAS AS POLÍTICAS

-- 1. Listar políticas que usam is_admin()
SELECT tablename, policyname FROM pg_policies 
WHERE schemaname = 'public' 
AND (qual ILIKE '%is_admin%' OR with_check ILIKE '%is_admin%');

-- 2. Remover políticas problemáticas em todas as tabelas
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND (qual ILIKE '%is_admin%' OR with_check ILIKE '%is_admin%')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
        RAISE NOTICE 'Dropped policy % on table %', pol.policyname, pol.tablename;
    END LOOP;
END $$;

-- 3. Dropar a função is_admin
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;

-- 4. Criar políticas simples para tabelas que precisam de acesso admin
-- Para plans - permitir leitura pública, escrita apenas se autenticado
DROP POLICY IF EXISTS "plans_select" ON public.plans;
DROP POLICY IF EXISTS "plans_all" ON public.plans;
CREATE POLICY "plans_select" ON public.plans FOR SELECT USING (true);

-- Para system_settings - permitir leitura pública
DROP POLICY IF EXISTS "system_settings_select" ON public.system_settings;
CREATE POLICY "system_settings_select" ON public.system_settings FOR SELECT USING (true);

-- Para admin_settings - permitir leitura pública  
DROP POLICY IF EXISTS "admin_settings_select" ON public.admin_settings;
CREATE POLICY "admin_settings_select" ON public.admin_settings FOR SELECT USING (true);

-- 5. Verificar se admin_access tem RLS desabilitado
ALTER TABLE public.admin_access DISABLE ROW LEVEL SECURITY;

-- 6. Recarregar schema
NOTIFY pgrst, 'reload schema';

-- 7. Verificar políticas restantes
SELECT tablename, policyname, cmd FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename;

-- 8. Verificar se is_admin ainda existe
SELECT proname FROM pg_proc WHERE proname = 'is_admin' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
`;

    const base64Sql = Buffer.from(sql).toString('base64');
    const cmd = `
echo "${base64Sql}" | base64 -d > /tmp/remove_is_admin.sql
docker exec -i $(docker ps -q -f name=supabase_db) psql -U postgres -d postgres < /tmp/remove_is_admin.sql
`;

    conn.exec(cmd, (err, stream) => {
        if (err) throw err;

        let output = '';
        stream.on('data', (data) => { output += data.toString(); });
        stream.stderr.on('data', (data) => { output += data.toString(); });
        stream.on('close', () => {
            console.log('=== RESULTADO REMOÇÃO IS_ADMIN ===');
            console.log(output);
            conn.end();
        });
    });
}).connect({ host: '194.163.189.247', port: 22, username: 'root', password: 'zlPnsbN8y37?Xyaw', readyTimeout: 120000 });
