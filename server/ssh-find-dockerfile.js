import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado');

    const cmds = [
        'echo "=== ESTRUTURA DE PASTAS ==="',
        'ls -la /root/ublochat/',
        'echo ""',
        'echo "=== EXISTE DOCKERFILE? ==="',
        'ls -la /root/ublochat/Dockerfile* 2>/dev/null || echo "Nenhum Dockerfile"',
        'echo ""',
        'echo "=== EXISTE PASTA APP OU FRONTEND? ==="',
        'ls -la /root/ublochat/app/ 2>/dev/null || echo "Não tem /app"',
        'ls -la /root/ublochat/frontend/ 2>/dev/null || echo "Não tem /frontend"',
        'echo ""',
        'echo "=== CONTAINER FRONTEND ==="',
        'docker ps | grep -E "front|react|nginx|caddy" || echo "Nenhum container frontend encontrado"',
        'echo ""',
        'echo "=== INSPECIONAR CONTAINER BACKEND ==="',
        'docker inspect ublochat_backend.1.$(docker service ps ublochat_backend -q --filter desired-state=running | head -1) 2>/dev/null | grep -A5 "Env" | head -20 || docker inspect $(docker ps -q --filter "name=ublochat") 2>/dev/null | grep -A5 "Env" | head -20'
    ];

    conn.exec(cmds.join(' && '), (err, stream) => {
        if (err) throw err;

        let output = '';
        stream.on('data', (data) => output += data.toString());
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
