import { Client } from 'ssh2';

const conn = new Client();
let fullOutput = '';

conn.on('ready', () => {
    console.log('✅ SSH Client :: Ready');

    // Inspect running containers to find source paths
    const cmds = [
        "docker ps --format '{{.Names}}'",
        "echo '---MOUNTS---'",
        "docker inspect $(docker ps -q) --format '{{.Name}}: {{range .Mounts}}{{.Source}} {{end}}' | grep -v 'supabase'"
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
