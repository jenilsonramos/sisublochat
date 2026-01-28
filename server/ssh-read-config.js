import { Client } from 'ssh2';

const conn = new Client();
let fullOutput = '';

conn.on('ready', () => {
    console.log('✅ SSH Client :: Ready');

    // Commands to run
    const cmds = [
        "cat /root/evolutionapi/.env.local",
        "echo '---SEP---'",
        "cat /root/evolutionapi/server/.env",
        "echo '---SEP---'",
        "pm2 status || echo 'PM2 not found'",
        "echo '---SEP---'",
        "docker ps -a --format '{{.Names}}' | grep evolution || echo 'No evolution containers'"
    ];

    conn.exec(cmds.join(' && '), (err, stream) => {
        if (err) throw err;
        stream.on('data', (data) => {
            fullOutput += data.toString();
        });
        stream.on('close', (code, signal) => {
            console.log('---- SERVER CONFIG & STATUS ----');
            console.log(fullOutput.trim());
            console.log('-------------------------------');
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
