import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor Supabase');

    const cmds = [
        'echo "=== INSTÂNCIAS NO BANCO ==="',
        'docker exec $(docker ps -q -f name=supabase_db) psql -U postgres -d postgres -c "SELECT id, name FROM instances;" 2>&1',
        'echo ""',
        'echo "=== CHATBOTS NO BANCO ==="',
        'docker exec $(docker ps -q -f name=supabase_db) psql -U postgres -d postgres -c "SELECT id, keyword, instance_id, is_active FROM chatbots;" 2>&1'
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
