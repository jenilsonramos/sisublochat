import { Client } from 'ssh2';

const conn = new Client();
let fullOutput = '';

conn.on('ready', () => {
    console.log('✅ SSH Client :: Ready');

    // Check docker-compose content and network issues
    const cmds = [
        "cd /root/evolutionapi",
        "docker compose -f docker-compose.prod.yml build app_frontend 2>&1"
    ];

    conn.exec(cmds.join(' && '), (err, stream) => {
        if (err) throw err;
        stream.on('data', (data) => {
            console.log(data.toString());
            fullOutput += data.toString();
        });
        stream.on('close', (code, signal) => {
            console.log('Build output capture finished.');
            conn.end();
        });
    });
}).connect({
    host: '135.181.37.206',
    port: 22,
    username: 'root',
    password: 'sv97TRbvFxjf',
    readyTimeout: 300000
});

conn.on('error', (err) => {
    console.error('❌ SSH Error:', err.message);
});
