import { Client } from 'ssh2';

const conn = new Client();
let fullOutput = '';

conn.on('ready', () => {
    console.log('✅ SSH Client :: Ready');

    // Search for the old tenant ID in the whole filesystem
    const cmd = "grep -r 'kvjpmwvwlbkqlsdysmxy' / --exclude-dir={proc,sys,dev,node_modules} 2>/dev/null | head -n 20";

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
    host: '135.181.37.206',
    port: 22,
    username: 'root',
    password: 'sv97TRbvFxjf',
    readyTimeout: 60000
});

conn.on('error', (err) => {
    console.error('❌ SSH Error:', err.message);
});
