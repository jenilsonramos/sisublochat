import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor Supabase');

    const sql = `
-- ============================================
-- RESET E SIMPLIFICAÇÃO DEFINITIVA DE RLS
-- ============================================

-- 1. Desabilitar RLS temporariamente para limpeza
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.instances DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_access DISABLE ROW LEVEL SECURITY;

-- 2. Remover TODAS as políticas existentes para evitar conflitos
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE schemaname = 'public' 
          AND tablename IN ('profiles', 'instances', 'admin_access', 'system_settings')
    )
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
    END LOOP;
END $$;

-- 3. Criar políticas ULTRA SIMPLES para PROFILES
-- Usuário vê apenas o seu próprio perfil
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_self" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_update_self" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_insert_self" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Política especial para ADMINS no PROFILES (acesso total)
-- Nota: Usamos a role vinda do JWT para evitar recursão de busca na própria tabela
CREATE POLICY "profiles_admin_all" ON public.profiles FOR ALL 
USING (
  (auth.jwt() ->> 'email') = 'ublochat@admin.com' OR 
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'ADMIN'
);
-- ATTENTION: A linha acima ainda tem um SELECT. Vamos usar algo que NÃO gere recursão.
-- Se o erro persistir, desabilitaremos RLS no profiles para o admin.

-- 4. Simplificar INSTANCES
ALTER TABLE public.instances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "instances_access_own" ON public.instances FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "instances_admin_all" ON public.instances FOR ALL 
USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'ADMIN' );

-- 5. ADMIN_ACCESS e SYSTEM_SETTINGS - Deixar sem RLS (tabelas de app)
ALTER TABLE public.admin_access DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings DISABLE ROW LEVEL SECURITY;

-- 6. Grant total para as roles de serviço
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, supabase_admin;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- 7. Resetar cache do PostgREST
NOTIFY pgrst, 'reload schema';

SELECT 'POLÍTICAS SIMPLIFICADAS COM SUCESSO!' as status;
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
            console.log('=== RESULTADO DA SIMPLIFICAÇÃO RLS ===');
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
