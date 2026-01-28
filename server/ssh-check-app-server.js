import { Client } from 'ssh2';

const conn = new Client();
let fullOutput = '';

conn.on('ready', () => {
    console.log('✅ SSH Client :: Ready');

    // Check for .env files in common locations on this server
    const cmds = [
        "ls -la /root/.env*",
        "echo '---SUPABASE---'",
        "ls -la /root/supabase/.env*",
        "echo '---PROCESSES---'",
        "pm2 list || echo 'no pm2'",
        "docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'"
    ];

    conn.exec(cmds.join(' && '), (err, stream) => {
        if (err) throw err;
        stream.on('data', (data) => {
            fullOutput += data.toString();
        });
        stream.on('close', (code, signal) => {
            console.log(fullOutput);
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
    console.error('❌ SSH Error:', err.message);
});
