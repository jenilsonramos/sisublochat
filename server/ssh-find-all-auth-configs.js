import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Client :: Ready');

    // Commands to find and grep all .env files
    const cmds = [
        "find /root/supabase -name '.env' -print -exec grep -H -i 'AUTOCONFIRM' {} \\;",
        "echo '--- DOCKER COMPOSE FULL ---'",
        "cat /root/supabase/docker/docker-compose.yml"
    ];

    conn.exec(cmds.join(' && '), (err, stream) => {
        if (err) throw err;
        let output = '';
        stream.on('data', (d) => output += d.toString());
        stream.on('close', () => {
            console.log(output);
            conn.end();
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
