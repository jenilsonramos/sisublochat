import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor Supabase');

    // Fix permissions and RLS for is_admin function
    const sql = `
-- Grant EXECUTE permission on is_admin to all relevant roles
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticator;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO service_role;

-- Grant SELECT on admin_access to authenticator (needed for is_admin function)
GRANT SELECT ON public.admin_access TO authenticator;
GRANT SELECT ON public.admin_access TO anon;
GRANT SELECT ON public.admin_access TO authenticated;

-- Ensure admin_access has RLS disabled (it's a small internal table)
ALTER TABLE public.admin_access DISABLE ROW LEVEL SECURITY;

-- Ensure admin_access table is accessible during schema cache build
ALTER TABLE public.admin_access OWNER TO postgres;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- Verify permissions
SELECT has_function_privilege('authenticator', 'public.is_admin()', 'EXECUTE') AS authenticator_can_execute;
SELECT has_function_privilege('anon', 'public.is_admin()', 'EXECUTE') AS anon_can_execute;

-- Test is_admin as authenticator role
SET ROLE authenticator;
SELECT public.is_admin() AS test_is_admin_as_authenticator;
RESET ROLE;
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
            console.log('=== CORREÇÃO DE PERMISSÕES is_admin ===');
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
