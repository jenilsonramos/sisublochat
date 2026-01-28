import { Client } from 'ssh2';

const conn = new Client();
let fullOutput = '';

conn.on('ready', () => {
    console.log('✅ SSH Client :: Ready');

    const cmds = [
        "ls -la /root/supabase/docker/.env",
        "echo '---CONTENT---'",
        "cat /root/supabase/docker/.env | grep -i AUTOCONFIRM",
        "echo '---RUNTIME---'",
        "docker exec supabase-auth env | grep -i AUTOCONFIRM"
    ];

    conn.exec(cmds.join(' && '), (err, stream) => {
        if (err) throw err;
        stream.on('data', (data) => {
            fullOutput += data.toString();
        });
        stream.on('close', (code, signal) => {
            console.log(fullOutput);
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
