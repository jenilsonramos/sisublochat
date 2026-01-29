import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor Supabase');

    const email = 'ublochat@admin.com';
    const adminId = '12345678-1234-1234-1234-1234567890ab';

    // Simplest possible insert with as few dependencies as possible
    const sqlInsert = `
INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at, email)
VALUES (
    '${adminId}',
    '${adminId}',
    '{"sub": "${adminId}", "email": "${email}"}'::jsonb,
    'email',
    '${adminId}',
    NOW(),
    NOW(),
    NOW(),
    '${email}'
) ON CONFLICT (id) DO UPDATE SET last_sign_in_at = NOW();
`;
    // I use adminId as the identity id too, it's usually fine or at least safe for testing

    conn.exec(`docker exec $(docker ps -q -f name=supabase_db) psql -U postgres -d postgres -c "${sqlInsert}"`, (err, stream) => {
        if (err) throw err;
        let output = '';
        stream.on('data', (data) => output += data.toString());
        stream.stderr.on('data', (data) => output += data.toString());
        stream.on('close', () => {
            console.log('=== RESULTADO INSERÇÃO (STDOUT + STDERR) ===');
            console.log(output);
            conn.end();
        });
    });
}).connect({ host: '194.163.189.247', port: 22, username: 'root', password: 'zlPnsbN8y37?Xyaw', readyTimeout: 120000 });
