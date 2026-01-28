import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
    console.log('✅ SSH Client :: Ready');
    conn.exec("docker ps -a --format '{{.Names}}'", (err, stream) => {
        if (err) throw err;
        stream.on('close', (code, signal) => {
            console.log('Stream :: close :: code: ' + code + ', signal: ' + signal);
            conn.end();
        }).on('data', (data) => {
            console.log('STDOUT: ' + data);
        }).stderr.on('data', (data) => {
            console.log('STDERR: ' + data);
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
