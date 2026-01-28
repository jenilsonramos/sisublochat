import { Client } from 'ssh2';

const conn = new Client();
let fullOutput = '';

conn.on('ready', () => {
    console.log('✅ SSH Client :: Ready');

    // Check bash history and find .env files anywhere
    const cmds = [
        "tail -n 50 /root/.bash_history",
        "echo '---FIND_ENV---'",
        "find / -name '.env*' -not -path '*/node_modules/*' 2>/dev/null",
        "echo '---DOCKER_INSPECT---'",
        "docker inspect traefik_traefik.1.0fjqr | grep -i 'workingdir' || echo 'no path found'"
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
