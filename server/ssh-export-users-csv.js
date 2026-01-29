import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor Supabase');

    // Export auth.users to a CSV file in the container
    const cmd = `
docker exec $(docker ps -q -f name=supabase_db) psql -U postgres -d postgres -c "COPY (SELECT * FROM auth.users WHERE email IN ('jenilson@yahoo.com', 'ublochat@admin.com')) TO STDOUT WITH CSV HEADER" > /tmp/users_debug.csv
cat /tmp/users_debug.csv
`;

    conn.exec(cmd, (err, stream) => {
        if (err) throw err;

        let output = '';
        stream.on('data', (data) => output += data.toString());
        stream.stderr.on('data', (data) => output += data.toString());
        stream.on('close', () => {
            console.log('=== CSV EXPORT auth.users ===');
            console.log(output);
            conn.end();
        });
    });
}).connect({ host: '194.163.189.247', port: 22, username: 'root', password: 'zlPnsbN8y37?Xyaw', readyTimeout: 120000 });
