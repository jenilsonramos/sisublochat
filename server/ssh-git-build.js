import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado');

    const cmds = [
        'cd /root/ublochat',
        'echo "=== GIT PULL ==="',
        'git pull origin main 2>&1 | tail -10',
        'echo ""',
        'echo "=== VERIFICANDO NODE/NPM ==="',
        'node --version 2>/dev/null || echo "Node não instalado"',
        'npm --version 2>/dev/null || echo "NPM não instalado"',
        'echo ""',
        'echo "=== INSTALANDO SE NECESSÁRIO ==="',
        'which node 2>/dev/null || (curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt-get install -y nodejs)',
        'echo ""',
        'echo "=== NPM INSTALL ==="',
        'npm install 2>&1 | tail -5',
        'echo ""',
        'echo "=== NPM BUILD ==="',
        'npm run build 2>&1 | tail -20',
        'echo ""',
        'echo "=== LISTANDO DIST ==="',
        'ls -la dist/ 2>/dev/null | head -10 || echo "Não existe dist"'
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
    readyTimeout: 300000 // 5 minutos para o build
});
