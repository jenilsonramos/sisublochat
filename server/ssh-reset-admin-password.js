import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor Supabase');

    // Set password for admin user (using crypt extension which is usually available)
    const newPassword = 'Admin123!@#'; // This is a temporary secure password
    const email = 'ublochat@admin.com';

    const sql = `
-- Update encrypted_password in auth.users
-- We need to use the crypt function if pgcrypto is available, or manually set a hash.
-- Supabase uses bcrypt for password hashing.
UPDATE auth.users 
SET encrypted_password = crypt('${newPassword}', gen_salt('bf'))
WHERE email = '${email}';
`;

    conn.exec(`docker exec $(docker ps -q -f name=supabase_db) psql -U postgres -d postgres -c "${sql}"`, (err, stream) => {
        if (err) throw err;

        let output = '';
        stream.on('data', (data) => output += data.toString());
        stream.stderr.on('data', (data) => output += data.toString());
        stream.on('close', () => {
            console.log('=== RESULTADO RESET SENHA ADMIN ===');
            console.log(output);
            console.log(`Senha temporária definida: ${newPassword}`);
            conn.end();
        });
    });
}).connect({ host: '194.163.189.247', port: 22, username: 'root', password: 'zlPnsbN8y37?Xyaw', readyTimeout: 120000 });
