import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado');

    const cmds = [
        'echo "=== CONTAINER FRONTEND ==="',
        'docker ps -a | grep -i front',
        'echo ""',
        'echo "=== INSPECIONAR IMAGEM FRONTEND ==="',
        'docker images | grep -i ublochat',
        'echo ""',
        'echo "=== IR PARA PASTA DO PROJETO ==="',
        'cd /root/ublochat && ls -la',
        'echo ""',
        'echo "=== VER SE TEM PACKAGE.JSON ==="',
        'cat /root/ublochat/package.json 2>/dev/null | head -20 || echo "Não tem package.json"',
        'echo ""',
        'echo "=== VER ONDE ESTÃO OS SOURCES ==="',
        'ls -la /root/ublochat/src/ 2>/dev/null || ls -la /root/ublochat/app/ 2>/dev/null || echo "Não encontrado src ou app"'
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
