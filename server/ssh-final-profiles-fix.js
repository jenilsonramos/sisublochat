import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor Supabase');

    const sql = `
-- CORREÇÃO FINAL DAS POLÍTICAS DE PROFILES
-- O problema: a política "Admin full access" consulta admin_access durante introspecção

-- 1. Listar políticas atuais em profiles
SELECT policyname, cmd, permissive, qual FROM pg_policies WHERE tablename = 'profiles';

-- 2. Remover todas as políticas antigas de profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin full access" ON public.profiles;
DROP POLICY IF EXISTS "admin_profiles_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;

-- 3. Criar políticas simples e diretas (sem chamar funções ou outras tabelas)
-- Política: usuários podem ver seu próprio perfil OU se são admin (role = 'ADMIN')
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT USING (
    auth.uid() = id 
    OR role = 'ADMIN'
  );

-- Política: usuários podem atualizar seu próprio perfil
CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Política: usuários podem inserir seu próprio perfil
CREATE POLICY "profiles_insert" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Política: admin pode deletar qualquer perfil (usando email do JWT direto na admin_access)
CREATE POLICY "profiles_delete" ON public.profiles
  FOR DELETE USING (
    auth.uid() = id 
    OR EXISTS (SELECT 1 FROM public.admin_access WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid()))
  );

-- 4. Verificar ID do admin em auth.users
SELECT id, email FROM auth.users WHERE email = 'ublochat@admin.com';

-- 5. Verificar se admin está em profiles com o ID correto
SELECT id, email, role FROM public.profiles WHERE email = 'ublochat@admin.com';

-- 6. Atualizar perfil do admin para ter o ID correto de auth.users se necessário
UPDATE public.profiles 
SET id = (SELECT id FROM auth.users WHERE email = 'ublochat@admin.com')
WHERE email = 'ublochat@admin.com' 
AND id != (SELECT id FROM auth.users WHERE email = 'ublochat@admin.com');

-- 7. Recarregar schema
NOTIFY pgrst, 'reload schema';

-- 8. Verificação final
SELECT 'auth.users' as tabela, id, email FROM auth.users WHERE email = 'ublochat@admin.com'
UNION ALL
SELECT 'profiles' as tabela, id, email FROM public.profiles WHERE email = 'ublochat@admin.com';
`;

    const base64Sql = Buffer.from(sql).toString('base64');
    const cmd = `
echo "${base64Sql}" | base64 -d > /tmp/final_profiles_fix.sql
docker exec -i $(docker ps -q -f name=supabase_db) psql -U postgres -d postgres < /tmp/final_profiles_fix.sql
`;

    conn.exec(cmd, (err, stream) => {
        if (err) throw err;

        let output = '';
        stream.on('data', (data) => { output += data.toString(); });
        stream.stderr.on('data', (data) => { output += data.toString(); });
        stream.on('close', () => {
            console.log('=== RESULTADO CORREÇÃO PROFILES ===');
            console.log(output);
            conn.end();
        });
    });
}).connect({ host: '194.163.189.247', port: 22, username: 'root', password: 'zlPnsbN8y37?Xyaw', readyTimeout: 120000 });
