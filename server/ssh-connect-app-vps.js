import { Client } from 'ssh2';

const conn = new Client();
let fullOutput = '';

conn.on('ready', () => {
    console.log('✅ SSH Client :: Ready on 89.167.4.98');

    // Command to check directory and env files
    const cmd = "find /root /var/www -maxdepth 3 -name '.env*' 2>/dev/null";

    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        stream.on('data', (data) => {
            fullOutput += data.toString();
        });
        stream.on('close', (code, signal) => {
            console.log('---- ENV FILES FOUND ON APP SERVER ----');
            console.log(fullOutput.trim());
            console.log('---------------------------------------');
            conn.end();
        });
    });
}).connect({
    host: '89.167.4.98',
    port: 22,
    username: 'root',
    password: 'TuAim3MdvuNr',
    readyTimeout: 30000
});

conn.on('error', (err) => {
    console.error('❌ SSH Error on 89.167.4.98:', err.message);
});
