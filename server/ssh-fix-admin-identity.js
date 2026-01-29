import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor Supabase');

    // Get admin UUID and insert identity
    const email = 'ublochat@admin.com';
    const sql = `
DO $$
DECLARE
    admin_id UUID;
    identity_id UUID := gen_random_uuid();
BEGIN
    SELECT id INTO admin_id FROM auth.users WHERE email = '${email}';
    
    IF admin_id IS NOT NULL THEN
        INSERT INTO auth.identities (
            id,
            user_id,
            identity_data,
            provider,
            provider_id,
            last_sign_in_at,
            created_at,
            updated_at,
            email
        ) VALUES (
            identity_id,
            admin_id,
            format('{"sub": "%s", "email": "%s"}', admin_id, '${email}')::jsonb,
            'email',
            admin_id::text,
            NOW(),
            NOW(),
            NOW(),
            '${email}'
        ) ON CONFLICT (provider, provider_id) DO NOTHING;
        
        RAISE NOTICE 'Identidade criada para % com ID %', '${email}', identity_id;
    ELSE
        RAISE EXCEPTION 'Usuário % não encontrado', '${email}';
    END IF;
END $$;
`;

    conn.exec(`docker exec $(docker ps -q -f name=supabase_db) psql -U postgres -d postgres -c "${sql}"`, (err, stream) => {
        if (err) throw err;

        let output = '';
        stream.on('data', (data) => output += data.toString());
        stream.stderr.on('data', (data) => output += data.toString());
        stream.on('close', () => {
            console.log('=== CRIAÇÃO DE IDENTIDADE CONCLUÍDA ===');
            console.log(output);
            conn.end();
        });
    });
}).connect({ host: '194.163.189.247', port: 22, username: 'root', password: 'zlPnsbN8y37?Xyaw', readyTimeout: 120000 });
