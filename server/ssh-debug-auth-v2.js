import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Client :: Ready on DB Server');

    const cmds = [
        "docker exec supabase-auth env | grep GOTRUE",
        "echo '---DATABASE_RECORDS---'",
        "docker exec supabase-db psql -U postgres -d postgres -t -c 'SELECT raw_base_config FROM auth.instances LIMIT 1;'"
    ];

    conn.exec(cmds.join(' && '), (err, stream) => {
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
