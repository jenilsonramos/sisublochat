import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado');

    const cmds = [
        'echo "=== TODOS OS CONTAINERS ==="',
        'docker ps -a --format "{{.Names}}: {{.Image}} ({{.Status}})"',
        'echo ""',
        'echo "=== DOCKER STACKS ==="',
        'docker stack ls 2>/dev/null || echo "Não tem docker swarm"',
        'echo ""',
        'echo "=== PROCURANDO ENV FILES ==="',
        'find /root -name ".env*" -type f 2>/dev/null | head -10',
        'find /home -name ".env*" -type f 2>/dev/null | head -10',
        'find /var -name ".env*" -type f 2>/dev/null | head -10',
        'echo ""',
        'echo "=== PROCURANDO VITE/REACT ==="',
        'find / -name "vite.config.*" 2>/dev/null | head -5',
        'echo ""',
        'echo "=== PROCURANDO DIST BUILD ==="',
        'find / -name "dist" -type d 2>/dev/null | grep -v node_modules | head -10'
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
    host: '77.42.84.214',
    port: 22,
    username: 'root',
    password: 'heagkwqejgxh',
    readyTimeout: 60000
});
