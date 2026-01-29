import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor de produção');

    // Find where the project is located
    const cmds = [
        'echo "=== LOCALIZANDO PROJETO ==="',
        'find / -name ".env" -path "*/evolutionapi/*" 2>/dev/null | head -5',
        'find / -name "package.json" -path "*/evolutionapi/*" 2>/dev/null | head -5',
        'echo ""',
        'echo "=== BUSCANDO EM /var/www ==="',
        'ls -la /var/www/ 2>/dev/null || echo "Não existe /var/www"',
        'echo ""',
        'echo "=== BUSCANDO EM /root ==="',
        'ls -la /root/ 2>/dev/null | head -20',
        'echo ""',
        'echo "=== BUSCANDO EM /home ==="',
        'ls -la /home/ 2>/dev/null || echo "Não existe /home"',
        'echo ""',
        'echo "=== DOCKER CONTAINERS ==="',
        'docker ps --format "{{.Names}}: {{.Image}}" 2>/dev/null | head -20'
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

conn.on('error', (err) => {
    console.error('❌ SSH Error:', err.message);
});
