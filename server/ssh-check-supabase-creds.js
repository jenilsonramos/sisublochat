import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor Supabase');

    // Check the actual credentials used by the Supabase stack
    const cmds = [
        'echo "=== VERIFICANDO CREDENCIAIS DO SUPABASE ==="',
        'docker service inspect supabase_supabase_db --format "{{range .Spec.TaskTemplate.ContainerSpec.Env}}{{println .}}{{end}}" 2>&1 | grep -i "PASS\\|USER" | head -5',
        'echo ""',
        'echo "=== TESTANDO CONEXÃO DIRETA NO CONTAINER ==="',
        'docker exec $(docker ps -q -f name=supabase_db) psql -U postgres -c "SELECT 1 as test;" 2>&1'
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
