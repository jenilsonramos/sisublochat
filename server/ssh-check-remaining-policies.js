import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor Supabase');

    // Check what policies still exist and if any reference deleted functions
    const sql = `
-- Verificar políticas que ainda podem referenciar funções deletadas
SELECT schemaname, tablename, policyname, qual, with_check
FROM pg_policies 
WHERE qual::text LIKE '%is_admin%' 
   OR with_check::text LIKE '%is_admin%'
   OR qual::text LIKE '%admin%';

-- Verificar políticas para profiles
SELECT tablename, policyname, permissive, cmd, qual 
FROM pg_policies 
WHERE tablename = 'profiles';

-- Verificar políticas para system_settings
SELECT tablename, policyname, permissive, cmd, qual 
FROM pg_policies 
WHERE tablename = 'system_settings';

-- Verificar se system_settings tem RLS
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('system_settings', 'profiles', 'subscriptions');

-- Verificar se existe a view ou função que causa erro
SELECT proname FROM pg_proc WHERE proname LIKE '%admin%' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
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
            console.log('=== ANÁLISE DE POLÍTICAS REMANESCENTES ===');
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
