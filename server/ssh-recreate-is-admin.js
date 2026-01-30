import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor Supabase');

    // Check existing functions and recreate is_admin
    const sql = `
-- Check all functions containing 'admin' in name
SELECT proname, pg_get_function_arguments(oid) as args, pg_get_functiondef(oid) as definition
FROM pg_proc 
WHERE proname LIKE '%admin%' 
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- Drop and recreate is_admin function properly
DROP FUNCTION IF EXISTS public.is_admin();

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_email text;
BEGIN
    -- Get email from JWT safely
    BEGIN
        user_email := current_setting('request.jwt.claims', true)::json->>'email';
    EXCEPTION WHEN OTHERS THEN
        user_email := NULL;
    END;
    
    -- If no email (anonymous user), return false
    IF user_email IS NULL OR user_email = '' THEN
        RETURN FALSE;
    END IF;
    
    -- Check if email exists in admin_access table
    RETURN EXISTS (
        SELECT 1 FROM public.admin_access 
        WHERE email = user_email
    );
EXCEPTION WHEN OTHERS THEN
    RETURN FALSE;
END;
$$;

-- Grant execute permission to all roles
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticator;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO service_role;
GRANT EXECUTE ON FUNCTION public.is_admin() TO PUBLIC;

-- Test the function
SELECT public.is_admin() AS test_result;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';

SELECT 'FUNÇÃO is_admin() RECRIADA COM SUCESSO!' AS status;
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
            console.log('=== RECRIAÇÃO DA FUNÇÃO is_admin ===');
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
