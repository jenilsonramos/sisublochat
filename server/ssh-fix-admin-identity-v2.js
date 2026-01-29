import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor Supabase');

    // Step 1: Get the ID
    const email = 'ublochat@admin.com';
    const sqlGetId = `SELECT id FROM auth.users WHERE email = '${email}';`;

    conn.exec(`docker exec $(docker ps -q -f name=supabase_db) psql -U postgres -d postgres -t -c "${sqlGetId}"`, (err, stream) => {
        if (err) throw err;

        let idOutput = '';
        stream.on('data', (data) => idOutput += data.toString());
        stream.on('close', () => {
            const adminId = idOutput.trim();
            console.log(`Admin ID: ${adminId}`);

            if (adminId) {
                // Step 2: Insert identity
                const sqlInsert = `
INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at, email)
VALUES (
    gen_random_uuid(),
    '${adminId}',
    '{"sub": "${adminId}", "email": "${email}"}'::jsonb,
    'email',
    '${adminId}',
    NOW(),
    NOW(),
    NOW(),
    '${email}'
) ON CONFLICT (provider, provider_id) DO NOTHING;
`;
                conn.exec(`docker exec $(docker ps -q -f name=supabase_db) psql -U postgres -d postgres -c "${sqlInsert}"`, (err2, stream2) => {
                    if (err2) throw err2;
                    let insertOutput = '';
                    stream2.on('data', (data) => insertOutput += data.toString());
                    stream2.on('close', () => {
                        console.log('=== RESULTADO INSERÇÃO ===');
                        console.log(insertOutput);
                        conn.end();
                    });
                });
            } else {
                console.error('Admin user not found');
                conn.end();
            }
        });
    });
}).connect({ host: '194.163.189.247', port: 22, username: 'root', password: 'zlPnsbN8y37?Xyaw', readyTimeout: 120000 });
