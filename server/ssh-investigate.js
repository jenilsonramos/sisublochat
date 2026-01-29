import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ Conectado ao servidor');

    // Check all docker stacks and their services/containers
    const cmds = [
        'docker stack ls',
        'echo "--- SERVICES ---"',
        'docker service ls',
        'echo "--- SUPABASE SERVICES ---"',
        'docker stack services supabase 2>/dev/null || echo "No supabase stack"',
        'echo "--- POSTGRES SERVICES ---"',
        'docker stack services postgres 2>/dev/null || echo "No postgres stack"',
        'echo "--- ALL CONTAINERS ---"',
        'docker ps --format "{{.Names}}: {{.Ports}}"'
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
    password: 'zlPnsbN8y37?Xyaw'
});
