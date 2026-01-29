import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor de produção');

    const cmds = [
        'echo "=== TESTE CURL MANUAL ==="',
        'curl -X POST -H "Content-Type: application/json" -d \'{"event": "test", "instance": "manual_test", "data": {"message": "hello"}}\' https://ublochat.com.br/webhook/evolution 2>&1',
        'echo ""',
        'echo "=== LOGS DO BACKEND (recentes) ==="',
        'docker logs ublochat_backend --tail 10 2>&1'
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
