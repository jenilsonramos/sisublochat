import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor Supabase');

    const sql = `
-- 1. Simplificar is_admin para lidar com NULL no JWT (anon)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
DECLARE
  u_email text;
BEGIN
  -- Get email from JWT safely
  u_email := auth.jwt()->>'email';
  
  IF u_email IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.admin_access 
    WHERE email = u_email
  );
EXCEPTION WHEN OTHERS THEN
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Garantir que admin_access NÃO tenha RLS habilitado (é uma tabela pequena e segura internamente)
-- Isso evita qualquer chance de recursão durante a introspecção
ALTER TABLE public.admin_access DISABLE ROW LEVEL SECURITY;

-- 3. Recarregar esquema
NOTIFY pgrst, 'reload schema';

-- 4. Verificar se o admin ublochat@admin.com está na tabela
SELECT email FROM public.admin_access WHERE email = 'ublochat@admin.com';
`;

    const base64Sql = Buffer.from(sql).toString('base64');
    const cmd = `
echo "${base64Sql}" | base64 -d > /tmp/admin_access_fix.sql
docker exec -i $(docker ps -q -f name=supabase_db) psql -U postgres -d postgres < /tmp/admin_access_fix.sql
`;

    conn.exec(cmd, (err, stream) => {
        if (err) throw err;

        let output = '';
        stream.on('data', (data) => output += data.toString());
        stream.stderr.on('data', (data) => output += data.toString());
        stream.on('close', () => {
            console.log('=== RESULTADO SIMPLIFICAÇÃO ADMIN ===');
            console.log(output);
            conn.end();
        });
    });
}).connect({ host: '194.163.189.247', port: 22, username: 'root', password: 'zlPnsbN8y37?Xyaw', readyTimeout: 120000 });
