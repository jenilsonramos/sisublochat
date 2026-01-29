import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado');

    // Rebuild and redeploy the stack
    const cmds = [
        'cd /root/ublochat',
        'echo "=== VERIFICANDO VARIÁVEIS ==="',
        'cat .env',
        'echo ""',
        'echo "=== FAZENDO BUILD DO FRONTEND ==="',
        // Check if node/npm is installed
        'which npm 2>/dev/null || echo "NPM não instalado"',
        'which node 2>/dev/null || echo "Node não instalado"',
        // Try to rebuild
        'npm install 2>&1 | tail -10 || echo "Falha no npm install"',
        'npm run build 2>&1 | tail -20 || echo "Falha no npm run build"',
        'echo ""',
        'echo "=== REINICIANDO STACK DOCKER ==="',
        'docker stack rm ublochat 2>/dev/null || echo "Stack não existe"',
        'sleep 5',
        'docker stack deploy -c docker-compose.prod.yml ublochat 2>&1',
        'echo ""',
        'echo "=== STATUS DOS SERVIÇOS ==="',
        'docker service ls 2>&1 | grep ublochat'
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
    readyTimeout: 120000
});
