import { Client } from 'ssh2';

const conn = new Client();
let fullOutput = '';

conn.on('ready', () => {
    console.log('✅ SSH Client :: Ready');

    // Comprehensive check
    const cmds = [
        "ls -F /root",
        "echo '---EVO_DIR---'",
        "ls -la /root/evolutionapi 2>&1",
        "echo '---PORTS---'",
        "netstat -lntp",
        "echo '---DOCKER---'",
        "docker ps --format '{{.Names}}'"
    ];

    conn.exec(cmds.join(' && '), (err, stream) => {
        if (err) throw err;
        stream.on('data', (data) => {
            fullOutput += data.toString();
        });
        stream.stderr.on('data', (data) => {
            fullOutput += 'ERR: ' + data.toString();
        });
        stream.on('close', (code, signal) => {
            console.log(fullOutput);
            console.log('Check finished.');
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
