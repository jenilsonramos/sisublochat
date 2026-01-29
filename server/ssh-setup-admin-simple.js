import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor Supabase');

    const email = 'ublochat@admin.com';
    const hash = '$2b$10$Jte6cTbpmP1UM/IF9kvZjdmuKvOXxaCLm32JDO69';
    const id = '12345678-1234-1234-1234-1234567890ab'; // Test UUID

    const sql = `
-- 1. Clean up if exists
DELETE FROM public.profiles WHERE email = '${email}';
DELETE FROM auth.users WHERE email = '${email}';

-- 2. Insert into auth.users
INSERT INTO auth.users (
    id, 
    aud, 
    role, 
    email, 
    encrypted_password, 
    email_confirmed_at, 
    raw_app_meta_data, 
    raw_user_meta_data, 
    created_at, 
    updated_at,
    is_super_admin,
    instance_id
) VALUES (
    '${id}',
    'authenticated',
    'authenticated',
    '${email}',
    '${hash}',
    NOW(),
    '{"provider": "email", "providers": ["email"]}',
    '{"full_name": "Administrator"}',
    NOW(),
    NOW(),
    false,
    '00000000-0000-0000-0000-000000000000'
);

-- 3. Update profile role (Trigger already created the profile)
UPDATE public.profiles SET role = 'ADMIN', status = 'ACTIVE' WHERE id = '${id}';
`;

    const escapedSql = sql.replace(/'/g, "'\\''");
    const cmd = `echo '${escapedSql}' > /tmp/setup_admin_simple.sql && docker cp /tmp/setup_admin_simple.sql $(docker ps -q -f name=supabase_db):/tmp/setup_admin_simple.sql && docker exec $(docker ps -q -f name=supabase_db) psql -U postgres -d postgres -f /tmp/setup_admin_simple.sql`;

    conn.exec(cmd, (err, stream) => {
        if (err) throw err;

        let output = '';
        stream.on('data', (data) => output += data.toString());
        stream.stderr.on('data', (data) => output += data.toString());
        stream.on('close', () => {
            console.log('=== RESULTADO DA CRIAÇÃO DO ADMIN (SIMPLES) ===');
            console.log(output);
            conn.end();
        });
    });
}).connect({
    host: '194.163.189.247',
    port: 22,
    username: 'root',
    password: 'zlPnsbN8y37?Xyaw',
    readyTimeout: 120000
});
