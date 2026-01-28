import { Client } from 'ssh2';

const conn = new Client();
let fullOutput = '';

conn.on('ready', () => {
    console.log('✅ SSH Client :: Ready');
    conn.exec("docker ps -a --format '{{.Names}}'", (err, stream) => {
        if (err) throw err;
        stream.on('data', (data) => {
            fullOutput += data.toString();
        });
        stream.on('close', (code, signal) => {
            console.log('---- ALL CONTAINERS ----');
            console.log(fullOutput.trim());
            console.log('------------------------');
            conn.end();
        });
    });
}).connect({
    host: '135.181.37.206',
    port: 22,
    username: 'root',
    password: 'sv97TRbvFxjf',
    readyTimeout: 20000
});

conn.on('error', (err) => {
    console.error('❌ SSH Error:', err.message);
});
