import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor Supabase');

    // Run comprehensive RLS diagnostics
    const sql = `
-- List all policies that reference is_admin function
SELECT 
    schemaname,
    tablename,
    policyname,
    qual,
    with_check
FROM pg_policies 
WHERE qual::text LIKE '%is_admin%' 
   OR with_check::text LIKE '%is_admin%';

-- Check if is_admin function exists and its owner
SELECT 
    p.proname AS function_name,
    r.rolname AS owner,
    p.prosecdef AS security_definer,
    pg_get_functiondef(p.oid) AS definition
FROM pg_proc p
JOIN pg_roles r ON p.proowner = r.oid
WHERE p.proname = 'is_admin';

-- Check tables with RLS enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
  AND rowsecurity = true;

-- Test executing is_admin as authenticator role
SET ROLE authenticator;
SELECT public.is_admin();
RESET ROLE;

-- Check authenticator role permissions
SELECT has_function_privilege('authenticator', 'public.is_admin()', 'EXECUTE');

-- Check anon role permissions
SELECT has_function_privilege('anon', 'public.is_admin()', 'EXECUTE');

-- Check if admin_access table is accessible
SELECT has_table_privilege('anon', 'public.admin_access', 'SELECT');
`;

    const base64Sql = Buffer.from(sql).toString('base64');
    const cmd = `echo "${base64Sql}" | base64 -d | docker exec -i $(docker ps -q -f name=supabase_db) psql -U postgres -d postgres 2>&1`;

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
            console.log('=== DIAGNÓSTICO RLS COMPLETO ===');
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
