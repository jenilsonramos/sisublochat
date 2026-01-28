import { Client } from 'ssh2';

const conn = new Client();
let fullOutput = '';

conn.on('ready', () => {
    console.log('✅ SSH Client :: Ready');

    // Commands to check structure and current processes
    const cmds = [
        "ls -la /root/evolutionapi",
        "echo '---SERVER---'",
        "ls -la /root/evolutionapi/server",
        "echo '---NETSTAT---'",
        "netstat -tulnp | grep -E '(3000|3001|80|443)'"
    ];

    conn.exec(cmds.join(' && '), (err, stream) => {
        if (err) throw err;
        stream.on('data', (data) => {
            console.log(data.toString());
            fullOutput += data.toString();
        });
        stream.on('close', (code, signal) => {
            console.log('Finished deep check.');
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
