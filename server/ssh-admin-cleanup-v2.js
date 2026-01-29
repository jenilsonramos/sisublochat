import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor Supabase');

    const sql = `
-- 1. Remover admin da tabela profiles
DELETE FROM public.profiles WHERE email = 'ublochat@admin.com';

-- 2. Garantir que ele continua em admin_access
INSERT INTO public.admin_access (email)
VALUES ('ublochat@admin.com')
ON CONFLICT (email) DO NOTHING;

-- 3. Atualizar is_admin() para ser mais simples e focar na nova tabela
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN (
    EXISTS (
      SELECT 1 FROM public.admin_access 
      WHERE email = auth.jwt()->>'email'
    )
  );
EXCEPTION WHEN OTHERS THEN
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Listar TODAS as tabelas em public (sem truncar)
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;
`;

    const base64Sql = Buffer.from(sql).toString('base64');
    const cmd = `
echo "${base64Sql}" | base64 -d > /tmp/admin_cleanup.sql
docker exec -i $(docker ps -q -f name=supabase_db) psql -U postgres -d postgres < /tmp/admin_cleanup.sql
`;

    conn.exec(cmd, (err, stream) => {
        if (err) throw err;

        let output = '';
        stream.on('data', (data) => output += data.toString());
        stream.stderr.on('data', (data) => output += data.toString());
        stream.on('close', () => {
            console.log('=== RESULTADO CLEANUP ADMIN E LISTA TABELAS ===');
            console.log(output);
            conn.end();
        });
    });
}).connect({ host: '194.163.189.247', port: 22, username: 'root', password: 'zlPnsbN8y37?Xyaw', readyTimeout: 120000 });
