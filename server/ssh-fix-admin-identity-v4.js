import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor Supabase');

    const email = 'ublochat@admin.com';
    const adminId = '12345678-1234-1234-1234-1234567890ab';

    // Use dollar quoting for the JSONB string to avoid shell escaping issues
    const sqlInsert = `
INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at, email)
VALUES (
    '${adminId}',
    '${adminId}',
    $json$ {"sub": "${adminId}", "email": "${email}"} $json$::jsonb,
    'email',
    '${adminId}',
    NOW(),
    NOW(),
    NOW(),
    '${email}'
) ON CONFLICT (provider, provider_id) DO UPDATE SET last_sign_in_at = NOW();
`;

    conn.exec(`docker exec $(docker ps -q -f name=supabase_db) psql -U postgres -d postgres -c "${sqlInsert}"`, (err, stream) => {
        if (err) throw err;
        let output = '';
        stream.on('data', (data) => output += data.toString());
        stream.stderr.on('data', (data) => output += data.toString());
        stream.on('close', () => {
            console.log('=== RESULTADO INSERÇÃO (COM DOLLAR QUOTING) ===');
            console.log(output);
            conn.end();
        });
    });
}).connect({ host: '194.163.189.247', port: 22, username: 'root', password: 'zlPnsbN8y37?Xyaw', readyTimeout: 120000 });
