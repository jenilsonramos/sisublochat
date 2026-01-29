import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor Supabase');

    const cmds = [
        'echo "=== REINICIANDO SERVIÇO META ==="',
        'docker service update --force supabase_supabase_meta 2>&1 || docker restart $(docker ps -q --filter "name=meta") 2>&1',
        'echo ""',
        'echo "=== REINICIANDO SERVIÇO REST (PostgREST) ==="',
        'docker service update --force supabase_supabase_rest 2>&1 || docker restart $(docker ps -q --filter "name=rest") 2>&1',
        'echo ""',
        'echo "=== AGUARDANDO ==="',
        'sleep 10',
        'echo ""',
        'echo "=== STATUS DOS SERVIÇOS ==="',
        'docker service ls 2>&1 | grep supabase || docker ps --filter "name=supabase"'
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
