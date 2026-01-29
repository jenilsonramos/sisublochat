import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado');

    const cmds = [
        'echo "=== STATUS DOS SERVIÇOS SUPABASE ==="',
        'docker service ls | grep supabase',
        'echo ""',
        'echo "=== SERVIÇO FUNCTIONS ==="',
        'docker service ps supabase_supabase_functions 2>&1 | head -5',
        'echo ""',
        'echo "=== LOGS DO FUNCTIONS ==="',
        'docker service logs supabase_supabase_functions 2>&1 | tail -20'
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
