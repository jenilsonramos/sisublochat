import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado');

    const cmds = [
        'cd /root/ublochat',
        'echo "=== VERIFICANDO BUILD ==="',
        'ls -la dist/ | head -5',
        'echo ""',
        'echo "=== DEPLOY DO STACK ==="',
        'docker stack deploy -c docker-compose.prod.yml ublochat 2>&1',
        'echo ""',
        'echo "=== AGUARDANDO SERVIÇOS ==="',
        'sleep 10',
        'docker service ls | grep ublochat',
        'echo ""',
        'echo "=== STATUS DOS CONTAINERS ==="',
        'docker ps | grep ublochat'
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
