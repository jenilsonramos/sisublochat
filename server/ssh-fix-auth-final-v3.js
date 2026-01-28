import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Client :: Ready');

    // Simplest SQL possible to force autoconfirm
    const sql = "UPDATE auth.instances SET raw_base_config = raw_base_config || '{\"mailer\": {\"autoconfirm\": true}}';";

    conn.exec(`docker exec supabase-db psql -U postgres -d postgres -c "${sql}"`, (err, stream) => {
        if (err) throw err;
        stream.on('data', (d) => console.log('OUT: ' + d));
        stream.on('close', () => {
            console.log('SQL updated. Restarting auth container...');
            conn.exec('docker restart supabase-auth', (err2, stream2) => {
                stream2.on('close', () => {
                    console.log('Auth restarted.');
                    conn.end();
                });
            });
        });
    });
}).connect({
    host: '135.181.37.206',
    port: 22,
    username: 'root',
    password: 'sv97TRbvFxjf'
});

conn.on('error', (err) => {
    console.error('❌ SSH Error:', err.message);
});
