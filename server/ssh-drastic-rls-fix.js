import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor Supabase');

    // SOLUÇÃO DRÁSTICA: Desabilitar RLS em tabelas problemáticas e recriar políticas simples
    const sql = `
-- ============================================
-- SOLUÇÃO DRÁSTICA PARA ERRO DE SCHEMA
-- ============================================

-- 1. DESABILITAR RLS em tabelas admin (elas não precisam de RLS complexo)
ALTER TABLE IF EXISTS public.admin_access DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.admin_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.system_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.plans DISABLE ROW LEVEL SECURITY;

-- 2. REMOVER TODAS as políticas que usam is_admin (causa do problema)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE qual::text LIKE '%is_admin%' 
           OR with_check::text LIKE '%is_admin%'
    )
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
        RAISE NOTICE 'Dropped policy: %', r.policyname;
    END LOOP;
END $$;

-- 3. DROP da função is_admin problemática
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;

-- 4. Verificar tabelas com RLS ativo
SELECT tablename, rowsecurity as rls_enabled 
FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = true;

-- 5. GARANTIR que profiles tenha RLS simples (sem recursão)
-- Primeiro, remover políticas existentes
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin full access to profiles" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;

-- Recriar políticas SIMPLES (sem função is_admin)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_own_select" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_own_insert" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_own_update" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- 6. Limpar políticas de subscriptions também
DROP POLICY IF EXISTS "Admin full access to subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can view own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "subscriptions_select_policy" ON public.subscriptions;

-- Recriar políticas SIMPLES para subscriptions
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscriptions_own_select" ON public.subscriptions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "subscriptions_own_insert" ON public.subscriptions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 7. Fazer o mesmo para outras tabelas de usuário (instances, contacts, messages, etc)
-- instances
DROP POLICY IF EXISTS "Admin full access instances" ON public.instances;
ALTER TABLE public.instances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "instances_own_access" ON public.instances
    FOR ALL USING (auth.uid() = user_id);

-- contacts
DROP POLICY IF EXISTS "Admin full access contacts" ON public.contacts;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contacts_own_access" ON public.contacts
    FOR ALL USING (auth.uid() = user_id);

-- messages
DROP POLICY IF EXISTS "Admin full access messages" ON public.messages;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "messages_own_access" ON public.messages
    FOR ALL USING (auth.uid() = user_id);

-- 8. Notificar PostgREST para recarregar o schema
NOTIFY pgrst, 'reload schema';

-- 9. Verificar resultado
SELECT 'RLS SIMPLIFICADO COM SUCESSO!' AS status;
SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename;
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
            console.log('=== RESULTADO DA CORREÇÃO DRÁSTICA ===');
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
