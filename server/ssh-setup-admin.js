import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
  console.log('✅ SSH Conectado ao servidor Supabase');

  const email = 'ublochat@admin.com';
  const hash = '$2b$10$Jte6cTbpmP1UM/IF9kvZjdmuKvOXxaCLm32JDO69';

  const sql = `
DO $$
DECLARE
    new_user_id UUID := gen_random_uuid();
BEGIN
    -- 1. Insert into auth.users (Supabase Auth)
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
        confirmation_token,
        recovery_token,
        instance_id
    ) VALUES (
        new_user_id,
        'authenticated',
        'authenticated',
        '${email}',
        '${hash}',
        NOW(),
        '{"provider": "email", "providers": ["email"]}',
        '{"full_name": "Administrator"}',
        NOW(),
        NOW(),
        '',
        '',
        '00000000-0000-0000-0000-000000000000'
    ) ON CONFLICT (email) DO UPDATE SET encrypted_password = EXCLUDED.encrypted_password;

    -- 2. Insert into public.profiles (Application Profile)
    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        role,
        status,
        created_at,
        updated_at
    ) VALUES (
        (SELECT id FROM auth.users WHERE email = '${email}'),
        '${email}',
        'Administrator',
        'ADMIN',
        'ACTIVE',
        NOW(),
        NOW()
    ) ON CONFLICT (id) DO UPDATE SET role = 'ADMIN', status = 'ACTIVE';

    RAISE NOTICE 'Admin user created/updated: %', '${email}';
END $$;
`;

  // Write SQL to a temp file and execute it
  const escapedSql = sql.replace(/'/g, "'\\''");
  const cmd = `echo '${escapedSql}' > /tmp/setup_admin.sql && docker cp /tmp/setup_admin.sql $(docker ps -q -f name=supabase_db):/tmp/setup_admin.sql && docker exec $(docker ps -q -f name=supabase_db) psql -U postgres -d postgres -f /tmp/setup_admin.sql`;

  conn.exec(cmd, (err, stream) => {
    if (err) throw err;

    let output = '';
    stream.on('data', (data) => output += data.toString());
    stream.stderr.on('data', (data) => output += data.toString());
    stream.on('close', () => {
      console.log('=== RESULTADO DA CRIAÇÃO DO ADMIN ===');
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
