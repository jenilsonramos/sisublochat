import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor Supabase');

    const cmds = [
        'echo "=== COLUNAS DA TABELA flows ==="',
        'docker exec $(docker ps -q -f name=supabase_db) psql -U postgres -d postgres -t -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = \'flows\' ORDER BY ordinal_position;" 2>&1',
        'echo ""',
        'echo "=== CONTEÚDO DE UM FLUXO (LIMIT 1) ==="',
        'docker exec $(docker ps -q -f name=supabase_db) psql -U postgres -d postgres -c "SELECT name, status, trigger_type, trigger_value, nodes, edges FROM flows LIMIT 1;" 2>&1'
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
