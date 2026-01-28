import { Client } from 'ssh2';

const conn = new Client();
let fullOutput = '';

conn.on('ready', () => {
    console.log('✅ SSH Client :: Ready');

    // Commands to restart app and check status
    const cmds = [
        "cd /root/evolutionapi",
        "docker compose -f docker-compose.prod.yml up -d --build",
        "docker ps | grep ublochat"
    ];

    conn.exec(cmds.join(' && '), (err, stream) => {
        if (err) throw err;
        stream.on('data', (data) => {
            fullOutput += data.toString();
        });
        stream.on('stderr', (data) => {
            console.error('STDERR: ' + data);
        });
        stream.on('close', (code, signal) => {
            console.log('---- RESTART COMPLETED ----');
            console.log(fullOutput.trim());
            console.log('---------------------------');
            conn.end();
        });
    });
}).connect({
    host: '135.181.37.206',
    port: 22,
    username: 'root',
    password: 'sv97TRbvFxjf',
    readyTimeout: 60000 // Building might take longer
});

conn.on('error', (err) => {
    console.error('❌ SSH Error:', err.message);
});
