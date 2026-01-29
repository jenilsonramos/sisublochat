import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor Supabase');

    const sql = `
-- 1. Get admin user ID from auth.users
SELECT id, email FROM auth.users WHERE email = 'ublochat@admin.com';

-- 2. Create profile for admin if not exists
INSERT INTO public.profiles (id, email, full_name, role, status, created_at, updated_at)
SELECT 
    id,
    email,
    'Administrador',
    'ADMIN',
    'ACTIVE',
    NOW(),
    NOW()
FROM auth.users 
WHERE email = 'ublochat@admin.com'
ON CONFLICT (id) DO UPDATE SET role = 'ADMIN', status = 'ACTIVE', updated_at = NOW();

-- 3. Verify profile was created
SELECT id, email, role, status FROM public.profiles WHERE email = 'ublochat@admin.com';

-- 4. Ensure admin_access has the email
INSERT INTO public.admin_access (email) 
VALUES ('ublochat@admin.com')
ON CONFLICT (email) DO NOTHING;

-- 5. Update is_admin function to check both profiles and admin_access
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS \\$\\$
DECLARE
  u_id uuid;
  u_email text;
BEGIN
  -- Try to get user id
  u_id := auth.uid();
  
  -- Check if user has ADMIN role in profiles
  IF u_id IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM public.profiles WHERE id = u_id AND role = 'ADMIN') THEN
      RETURN TRUE;
    END IF;
  END IF;
  
  -- Check admin_access by email from JWT
  u_email := auth.jwt()->>'email';
  IF u_email IS NOT NULL AND EXISTS (SELECT 1 FROM public.admin_access WHERE email = u_email) THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
EXCEPTION WHEN OTHERS THEN
  RETURN FALSE;
END;
\\$\\$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Reload PostgREST schema
NOTIFY pgrst, 'reload schema';

-- 7. Final verification
SELECT 'auth.users' as source, id, email FROM auth.users WHERE email = 'ublochat@admin.com'
UNION ALL
SELECT 'profiles' as source, id, email FROM public.profiles WHERE email = 'ublochat@admin.com';
`;

    const base64Sql = Buffer.from(sql).toString('base64');
    const cmd = `
echo "${base64Sql}" | base64 -d > /tmp/complete_admin_fix.sql
docker exec -i $(docker ps -q -f name=supabase_db) psql -U postgres -d postgres < /tmp/complete_admin_fix.sql
`;

    conn.exec(cmd, (err, stream) => {
        if (err) throw err;

        let output = '';
        stream.on('data', (data) => output += data.toString());
        stream.stderr.on('data', (data) => output += data.toString());
        stream.on('close', () => {
            console.log('=== RESULTADO CORREÇÃO COMPLETA ===');
            console.log(output);
            conn.end();
        });
    });
}).connect({ host: '194.163.189.247', port: 22, username: 'root', password: 'zlPnsbN8y37?Xyaw', readyTimeout: 120000 });
