import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado');

    const cmds = [
        'echo "=== CONFIGURAÇÃO DO REALTIME NO STACK ==="',
        'docker service inspect supabase_supabase_realtime 2>&1 | grep -A50 "Env"',
        'echo ""',
        'echo "=== VERSÃO DO REALTIME ==="',
        'docker service inspect supabase_supabase_realtime --format "{{.Spec.TaskTemplate.ContainerSpec.Image}}"'
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
