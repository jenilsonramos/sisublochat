import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor Supabase');

    // Create a new admin user via SQL
    const sql = `
-- 1. Create user in auth.users
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token)
VALUES (
    gen_random_uuid(),
    'admin2@ublochat.com.br',
    crypt('Admin123!@#', gen_salt('bf')),
    now(),
    'authenticated',
    'authenticated',
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(),
    now(),
    ''
) RETURNING id;

-- 2. Grant admin role in public.profiles (will use a trigger or manual insert)
-- Assuming the id is returned, but I'll do a join-style insert
INSERT INTO public.profiles (id, email, role, status, created_at)
SELECT id, email, 'ADMIN', 'ACTIVE', now()
FROM auth.users WHERE email = 'admin2@ublochat.com.br'
ON CONFLICT (id) DO UPDATE SET role = 'ADMIN';

SELECT 'USUÁRIO admin2@ublochat.com.br CRIADO!' as status;
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
