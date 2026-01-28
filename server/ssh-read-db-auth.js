import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Client :: Ready');

    const cmd = "docker exec supabase-db psql -U postgres -d postgres -c 'SELECT id, raw_base_config->'\"'mailer'\"' FROM auth.instances;'";

    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        stream.on('data', (d) => console.log(d.toString()));
        stream.stderr.on('data', (d) => console.log('ERR: ' + d));
        stream.on('close', () => {
            conn.end();
        });
    });
}).connect({
    host: '135.181.37.206',
    port: 22,
    username: 'root',
    password: 'sv97TRbvFxjf',
    readyTimeout: 30000
});

conn.on('error', (err) => {
    console.error('❌ SSH Error:', err.message);
});
