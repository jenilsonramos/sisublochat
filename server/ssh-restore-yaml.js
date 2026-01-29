import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Client :: Ready');

    const cmds = [
        "cd /root/supabase",
        "git checkout docker/docker-compose.yml",
        "git status",
        "cd docker",
        "docker compose config -q && echo 'YAML fixed!'"
    ];

    conn.exec(cmds.join(' && '), (err, stream) => {
        if (err) throw err;
        stream.on('data', (d) => console.log('OUT: ' + d));
        stream.stderr.on('data', (d) => console.log('ERR: ' + d));
        stream.on('close', () => {
            console.log('Restore finished.');
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
