import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado');

    // Check Kong and Auth configurations
    const cmds = [
        'echo "=== KONG CONFIG ==="',
        'docker ps --filter "name=kong" --format "{{.Names}}: {{.Status}}"',
        'echo ""',
        'echo "=== AUTH CONFIG ==="',
        'docker ps --filter "name=auth" --format "{{.Names}}: {{.Status}}"',
        'echo ""',
        'echo "=== CHECK AUTH LOGS ==="',
        'docker service logs supabase_supabase_auth 2>&1 | tail -30'
    ];

    conn.exec(cmds.join(' && '), (err, stream) => {
        if (err) throw err;

        let output = '';
        stream.on('data', (data) => output += data.toString());
        stream.stderr.on('data', (data) => output += data.toString());
        stream.on('close', () => {
            console.log(output);
            conn.end();
        });
    });
}).connect({
    host: '194.163.189.247',
    port: 22,
    username: 'root',
    password: 'zlPnsbN8y37?Xyaw',
    readyTimeout: 60000
});
