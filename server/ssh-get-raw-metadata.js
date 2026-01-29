import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor Supabase');

    // Select metadata and print as plain text to avoid table formatting truncation
    const sql = `
SELECT email, raw_app_meta_data::text as app_meta, raw_user_meta_data::text as user_meta, is_super_admin, aud 
FROM auth.users 
WHERE email IN ('jenilson@yahoo.com', 'ublochat@admin.com');
`;

    conn.exec(`docker exec $(docker ps -q -f name=supabase_db) psql -U postgres -d postgres -t -c "${sql}"`, (err, stream) => {
        if (err) throw err;

        let output = '';
        stream.on('data', (data) => output += data.toString());
        stream.stderr.on('data', (data) => output += data.toString());
        stream.on('close', () => {
            console.log('=== METADADOS BRUTOS ===');
            console.log(output);
            conn.end();
        });
    });
}).connect({ host: '194.163.189.247', port: 22, username: 'root', password: 'zlPnsbN8y37?Xyaw', readyTimeout: 120000 });
