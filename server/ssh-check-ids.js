import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor Supabase');

    const sql = `
-- Verificar IDs exatos em ambas as tabelas
SELECT 'auth.users' as tabela, id::text, email FROM auth.users WHERE email = 'ublochat@admin.com';
SELECT 'profiles' as tabela, id::text, email, role FROM public.profiles WHERE email = 'ublochat@admin.com';

-- Verificar se IDs são iguais
SELECT 
  a.id as auth_id,
  p.id as profile_id,
  a.id = p.id as ids_match
FROM auth.users a
JOIN public.profiles p ON a.email = p.email
WHERE a.email = 'ublochat@admin.com';
`;

    const base64Sql = Buffer.from(sql).toString('base64');
    const cmd = `
echo "${base64Sql}" | base64 -d > /tmp/check_ids.sql
docker exec -i $(docker ps -q -f name=supabase_db) psql -U postgres -d postgres < /tmp/check_ids.sql
`;

    conn.exec(cmd, (err, stream) => {
        if (err) throw err;

        let output = '';
        stream.on('data', (data) => { output += data.toString(); });
        stream.stderr.on('data', (data) => { output += data.toString(); });
        stream.on('close', () => {
            console.log('=== VERIFICAÇÃO DE IDS ===');
            console.log(output);
            conn.end();
        });
    });
}).connect({ host: '194.163.189.247', port: 22, username: 'root', password: 'zlPnsbN8y37?Xyaw', readyTimeout: 120000 });
