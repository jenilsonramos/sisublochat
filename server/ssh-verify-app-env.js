import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Client :: Ready');

    // Check main app containers for environment variables
    const cmds = [
        "docker ps --format '{{.Names}}'",
        "echo '---VARS---'",
        "for container in $(docker ps --format '{{.Names}}'); do echo \"$container:\"; docker exec $container env | grep -E 'SUPABASE|EVOLUTION'; done"
    ];

    conn.exec(cmds.join(' && '), (err, stream) => {
        if (err) throw err;
        let output = '';
        stream.on('data', (d) => output += d.toString());
        stream.on('close', () => {
            console.log(output);
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
