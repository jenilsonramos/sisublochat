import { Client } from 'ssh2';

const conn = new Client();
let fullOutput = '';

conn.on('ready', () => {
    console.log('✅ SSH Client :: Ready');

    // Command to rebuild specifically the frontend to bake in new ENV vars
    const cmds = [
        "cd /root/evolutionapi",
        "docker compose -f docker-compose.prod.yml build app_frontend --no-cache",
        "docker compose -f docker-compose.prod.yml up -d",
        "docker ps"
    ];

    conn.exec(cmds.join(' && '), (err, stream) => {
        if (err) throw err;
        stream.on('data', (data) => {
            console.log('STDOUT: ' + data);
            fullOutput += data.toString();
        });
        stream.on('stderr', (data) => {
            console.error('STDERR: ' + data);
        });
        stream.on('close', (code, signal) => {
            console.log('---- REBUILD COMPLETED ----');
            console.log('Final Status Code:', code);
            conn.end();
        });
    });
}).connect({
    host: '135.181.37.206',
    port: 22,
    username: 'root',
    password: 'sv97TRbvFxjf',
    readyTimeout: 300000 // 5 minutes for build
});

conn.on('error', (err) => {
    console.error('❌ SSH Error:', err.message);
});
