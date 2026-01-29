import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor Supabase');

    const email = 'ublochat@admin.com';
    const adminId = '12345678-1234-1234-1234-1234567890ab';

    // Write SQL to a file on the server
    const sqlContent = `
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
) ON CONFLICT (provider, provider_id) DO UPDATE SET last_sign_in_at = NOW();
`;

    // We'll use a safe way to write the file: echo with base64 to avoid any escaping issues
    const base64Sql = Buffer.from(sqlContent).toString('base64');
    const cmd = `
echo "${base64Sql}" | base64 -d > /tmp/fix_identity.sql
docker exec -i $(docker ps -q -f name=supabase_db) psql -U postgres -d postgres < /tmp/fix_identity.sql
`;

    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        let output = '';
        stream.on('data', (data) => output += data.toString());
        stream.stderr.on('data', (data) => output += data.toString());
        stream.on('close', () => {
            console.log('=== RESULTADO INSERÇÃO (VIA ARQUIVO E BASE64) ===');
            console.log(output);
            conn.end();
        });
    });
}).connect({ host: '194.163.189.247', port: 22, username: 'root', password: 'zlPnsbN8y37?Xyaw', readyTimeout: 120000 });
