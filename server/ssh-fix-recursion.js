import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor Supabase');

    const sql = `
-- 1. Remover polícias recursivas
DROP POLICY IF EXISTS "Admins can view admin_access" ON public.admin_access;

-- 2. Criar nova política não recursiva: Usuário pode ver seu próprio registro de admin por email
CREATE POLICY "Admin check email" ON public.admin_access 
FOR SELECT USING (email = auth.jwt()->>'email');

-- 3. Permitir que administradores vejam TUDO em admin_access (usando a função de forma segura se necessário, mas vamos simplificar)
-- Na verdade, para o schema loader não quebrar, vamos deixar uma política simples baseada no JWT.
-- Se o email no JWT está na tabela, ele é admin.

-- 4. Re-grant execute on is_admin
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;

-- 5. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
`;

    const base64Sql = Buffer.from(sql).toString('base64');
    const cmd = `
echo "${base64Sql}" | base64 -d > /tmp/fix_recursion.sql
docker exec -i $(docker ps -q -f name=supabase_db) psql -U postgres -d postgres < /tmp/fix_recursion.sql
`;

    conn.exec(cmd, (err, stream) => {
        if (err) throw err;

        let output = '';
        stream.on('data', (data) => output += data.toString());
        stream.stderr.on('data', (data) => output += data.toString());
        stream.on('close', () => {
            console.log('=== RESULTADO FIX RECURSÃO ===');
            console.log(output);
            conn.end();
        });
    });
}).connect({ host: '194.163.189.247', port: 22, username: 'root', password: 'zlPnsbN8y37?Xyaw', readyTimeout: 120000 });
