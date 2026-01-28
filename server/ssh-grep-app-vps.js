import { Client } from 'ssh2';

const conn = new Client();
let fullOutput = '';

conn.on('ready', () => {
    console.log('✅ SSH Client :: Ready');

    // Search for the old tenant ID specifically in web directories
    const cmd = "grep -r 'kvjpmwvwlbkqlsdysmxy' /var/www /root --exclude-dir=node_modules 2>/dev/null | head -n 10";

    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        stream.on('data', (data) => {
            fullOutput += data.toString();
        });
        stream.on('close', (code, signal) => {
            console.log('---- GREP RESULTS ----');
            console.log(fullOutput.trim());
            console.log('----------------------');
            conn.end();
        });
    });
}).connect({
    host: '89.167.4.98',
    port: 22,
    username: 'root',
    password: 'TuAim3MdvuNr',
    readyTimeout: 60000
});

conn.on('error', (err) => {
    console.error('❌ SSH Error:', err.message);
});
