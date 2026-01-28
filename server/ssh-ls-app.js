import { Client } from 'ssh2';

const conn = new Client();
let fullOutput = '';

conn.on('ready', () => {
    console.log('✅ SSH Client :: Ready');

    // List directory
    const cmd = "ls -la /root/evolutionapi";

    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        stream.on('data', (data) => {
            fullOutput += data.toString();
        });
        stream.on('close', (code, signal) => {
            console.log('---- FILES IN /root/evolutionapi ----');
            console.log(fullOutput.trim());
            console.log('------------------------------------');
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
