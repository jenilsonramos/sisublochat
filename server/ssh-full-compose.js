import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado');

    const cmds = [
        'echo "=== TODOS OS ARQUIVOS .env* ==="',
        'ls -la /root/ublochat/.env* 2>/dev/null || echo "Nenhum .env"',
        'ls -la /root/ublochat/*/.env* 2>/dev/null || echo "Nenhum em subpastas"',
        'echo ""',
        'echo "=== DOCKER-COMPOSE COMPLETO ==="',
        'cat /root/ublochat/docker-compose.prod.yml'
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
