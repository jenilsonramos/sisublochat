import { Client } from 'ssh2';

const conn = new Client();
let fullOutput = '';

conn.on('ready', () => {
    console.log('✅ SSH Client :: Ready on 89.167.4.98');

    // Command to check directory
    const cmd = "ls -la /root/evolutionapi 2>/dev/null || ls -la /var/www/evolutionapi 2>/dev/null";

    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        stream.on('data', (data) => {
            fullOutput += data.toString();
        });
        stream.on('close', (code, signal) => {
            console.log('---- FILES FOUND ----');
            console.log(fullOutput.trim());
            console.log('---------------------');
            conn.end();
        });
    });
}).connect({
    host: '89.167.4.98',
    port: 22,
    username: 'root',
    password: 'sv97TRbvFxjf',
    readyTimeout: 30000
});

conn.on('error', (err) => {
    console.error('❌ SSH Error on 89.167.4.98:', err.message);
});
