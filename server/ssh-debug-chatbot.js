import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor de produção');

    const cmds = [
        'echo "=== LOGS RECENTES DO BACKEND ==="',
        'docker logs ublochat_backend --tail 50 2>&1',
        'echo ""',
        'echo "=== VERIFICANDO DADOS NO BANCO (BOTS ATIVOS) ==="',
        '# Note: Using the external Supabase port 5433 directly from host since we verified nc works',
        'PGPASSWORD=e52f57838865b7d25b4b8a161b3d3efa psql -h 194.163.189.247 -p 5433 -U postgres -d postgres -c "SELECT id, keyword, is_active, instance_id FROM chatbots;" 2>&1 | head -n 20'
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
