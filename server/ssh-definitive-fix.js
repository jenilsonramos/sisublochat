import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor Supabase');

    const sql = `
-- SOLUÇÃO DEFINITIVA PARA O ERRO DE SCHEMA
-- O problema é recursividade: is_admin() consulta profiles, 
-- profiles tem RLS que pode chamar is_admin()

-- 1. Desabilitar RLS na tabela admin_access (tabela pequena e segura)
ALTER TABLE public.admin_access DISABLE ROW LEVEL SECURITY;

-- 2. Recriar a função is_admin SEM consultar profiles
-- Usar apenas admin_access que não tem RLS
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  -- Only check admin_access table (no RLS = no recursion)
  RETURN EXISTS (
    SELECT 1 FROM public.admin_access 
    WHERE email = (auth.jwt()->>'email')
  );
EXCEPTION WHEN OTHERS THEN
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 3. Atualizar políticas da tabela profiles para não usar is_admin()
-- Em vez disso, verificar diretamente na admin_access
DROP POLICY IF EXISTS "Admin full access" ON public.profiles;
DROP POLICY IF EXISTS "admin_profiles_policy" ON public.profiles;

-- Política: usuários podem ver seu próprio perfil
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- Política: usuários podem atualizar seu próprio perfil  
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Política: admins podem ver todos os perfis (sem usar is_admin, consulta direta)
CREATE POLICY "Admin full access" ON public.profiles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.admin_access WHERE email = (auth.jwt()->>'email'))
  );

-- 4. Garantir que o RLS está habilitado em profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 5. Política para inserção de novos perfis (após registro)
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- 6. Recarregar o schema do PostgREST
NOTIFY pgrst, 'reload schema';

-- 7. Verificação final
SELECT 'Políticas em profiles:' as info;
SELECT policyname FROM pg_policies WHERE tablename = 'profiles';

SELECT 'Admin em admin_access:' as info;
SELECT email FROM public.admin_access;

SELECT 'Admin em profiles:' as info;
SELECT id, email, role FROM public.profiles WHERE role = 'ADMIN';
`;

    const base64Sql = Buffer.from(sql).toString('base64');
    const cmd = `
echo "${base64Sql}" | base64 -d > /tmp/definitive_fix.sql
docker exec -i $(docker ps -q -f name=supabase_db) psql -U postgres -d postgres < /tmp/definitive_fix.sql
`;

    conn.exec(cmd, (err, stream) => {
        if (err) throw err;

        let output = '';
        stream.on('data', (data) => { output += data.toString(); });
        stream.stderr.on('data', (data) => { output += data.toString(); });
        stream.on('close', () => {
            console.log('=== RESULTADO CORREÇÃO DEFINITIVA ===');
            console.log(output);
            conn.end();
        });
    });
}).connect({ host: '194.163.189.247', port: 22, username: 'root', password: 'zlPnsbN8y37?Xyaw', readyTimeout: 120000 });
