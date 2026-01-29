import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado');

    const cmds = [
        'echo "=== LOGS DETALHADOS DO REALTIME ==="',
        'docker service logs supabase_supabase_realtime 2>&1 --tail 100 | grep -i "error\\|fail\\|exception\\|fatal" | head -30',
        'echo ""',
        'echo "=== ÚLTIMOS LOGS (COMPLETO) ==="',
        'docker service logs supabase_supabase_realtime 2>&1 | tail -40'
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
    readyTimeout: 60000
});
