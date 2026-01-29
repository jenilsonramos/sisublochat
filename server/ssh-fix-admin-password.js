import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor Supabase');

    // Create proper bcrypt password hash and update user
    // The password will be: Admin123!@#
    const sql = `
-- 1. First, let's check the current state of the admin user
SELECT id, email, 
       CASE WHEN encrypted_password IS NULL THEN 'NO PASSWORD' 
            WHEN encrypted_password = '' THEN 'EMPTY PASSWORD'
            ELSE 'HAS PASSWORD' END as password_status,
       email_confirmed_at,
       confirmed_at
FROM auth.users 
WHERE email = 'ublochat@admin.com';

-- 2. Update the password using crypt (bcrypt)
UPDATE auth.users 
SET encrypted_password = crypt('Admin123!@#', gen_salt('bf')),
    email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
    confirmed_at = COALESCE(confirmed_at, NOW()),
    updated_at = NOW()
WHERE email = 'ublochat@admin.com';

-- 3. Verify the update
SELECT id, email, 
       CASE WHEN encrypted_password IS NULL THEN 'NO PASSWORD' 
            WHEN encrypted_password = '' THEN 'EMPTY PASSWORD'
            ELSE 'HAS PASSWORD (UPDATED)' END as password_status,
       email_confirmed_at IS NOT NULL as email_confirmed
FROM auth.users 
WHERE email = 'ublochat@admin.com';

-- 4. Also check if the user has a profile
SELECT id, email, role FROM public.profiles WHERE email = 'ublochat@admin.com';
`;

    const base64Sql = Buffer.from(sql).toString('base64');
    const cmd = `
echo "${base64Sql}" | base64 -d > /tmp/fix_admin_password.sql
docker exec -i $(docker ps -q -f name=supabase_db) psql -U postgres -d postgres < /tmp/fix_admin_password.sql
`;

    conn.exec(cmd, (err, stream) => {
        if (err) throw err;

        let output = '';
        stream.on('data', (data) => output += data.toString());
        stream.stderr.on('data', (data) => output += data.toString());
        stream.on('close', () => {
            console.log('=== RESULTADO CORREÇÃO SENHA ADMIN ===');
            console.log(output);
            conn.end();
        });
    });
}).connect({ host: '194.163.189.247', port: 22, username: 'root', password: 'zlPnsbN8y37?Xyaw', readyTimeout: 120000 });
