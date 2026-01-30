import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor Supabase');

    const sql = `
-- 1. Listar TODAS as políticas que podem causar recursão
SELECT tablename, policyname, 
       CASE 
         WHEN qual LIKE '%is_admin%' THEN 'USA is_admin()'
         WHEN qual LIKE '%admin_access%' THEN 'CONSULTA admin_access'
         WHEN qual LIKE '%profiles%' THEN 'CONSULTA profiles'
         ELSE 'OK'
       END as problema
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename;

-- 2. Listar tabelas com RLS habilitado
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = true;

-- 3. Verificar função is_admin
SELECT prosrc FROM pg_proc WHERE proname = 'is_admin' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
`;

    const base64Sql = Buffer.from(sql).toString('base64');
    const cmd = `
echo "${base64Sql}" | base64 -d > /tmp/full_audit.sql
docker exec -i $(docker ps -q -f name=supabase_db) psql -U postgres -d postgres < /tmp/full_audit.sql
`;

    conn.exec(cmd, (err, stream) => {
        if (err) throw err;

        let output = '';
        stream.on('data', (data) => { output += data.toString(); });
        stream.stderr.on('data', (data) => { output += data.toString(); });
        stream.on('close', () => {
            console.log('=== AUDITORIA COMPLETA ===');
            console.log(output);
            conn.end();
        });
    });
}).connect({ host: '194.163.189.247', port: 22, username: 'root', password: 'zlPnsbN8y37?Xyaw', readyTimeout: 120000 });
