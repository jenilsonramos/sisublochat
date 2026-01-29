import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor Supabase');

    // Create is_admin and check auth.uid
    const sql = `
-- Fix is_admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'ADMIN'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant usage on auth if needed
GRANT USAGE ON SCHEMA auth TO anon, authenticated;
GRANT SELECT ON public.profiles TO anon, authenticated;

-- Check if auth.uid exists
SELECT proname, pronamespace::regnamespace 
FROM pg_proc 
WHERE proname = 'uid' AND pronamespace = 'auth'::regnamespace;
`;

    conn.exec(`docker exec $(docker ps -q -f name=supabase_db) psql -U postgres -d postgres -c "${sql}"`, (err, stream) => {
        if (err) throw err;

        let output = '';
        stream.on('data', (data) => output += data.toString());
        stream.stderr.on('data', (data) => output += data.toString());
        stream.on('close', () => {
            console.log('=== RESULTADO FIX IS_ADMIN ===');
            console.log(output);
            conn.end();
        });
    });
}).connect({ host: '194.163.189.247', port: 22, username: 'root', password: 'zlPnsbN8y37?Xyaw', readyTimeout: 120000 });
