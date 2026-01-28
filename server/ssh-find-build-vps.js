import { Client } from 'ssh2';

const conn = new Client();
let fullOutput = '';

conn.on('ready', () => {
    console.log('✅ SSH Client :: Ready');

    // Find the specific build file on this server
    const cmd = "find / -name 'index-W6a_SElj.js' 2>/dev/null";

    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        stream.on('data', (data) => {
            fullOutput += data.toString();
        });
        stream.on('close', (code, signal) => {
            console.log('---- FIND RESULTS ----');
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
