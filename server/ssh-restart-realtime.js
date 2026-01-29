import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado');

    const cmds = [
        'echo "=== REINICIANDO SERVIÇO REALTIME ==="',
        'docker service update --force supabase_supabase_realtime 2>&1',
        'echo ""',
        'echo "=== AGUARDANDO 15s ==="',
        'sleep 15',
        'echo ""',
        'echo "=== LOGS DO REALTIME APÓS RESTART ==="',
        'docker service logs supabase_supabase_realtime 2>&1 | tail -30',
        'echo ""',
        'echo "=== STATUS DO REALTIME ==="',
        'docker service ps supabase_supabase_realtime 2>&1 | head -5'
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
    password: 'zlPnsbN8y37?Xyaw',
    readyTimeout: 120000
});
