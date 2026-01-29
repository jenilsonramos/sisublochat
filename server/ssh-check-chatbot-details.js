import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor Supabase');

    const cmds = [
        'echo "=== DETALHES DO CHATBOT ==="',
        'docker exec $(docker ps -q -f name=supabase_db) psql -U postgres -d postgres -c "SELECT id, keyword, instance_id, is_active FROM chatbots;" 2>&1',
        'echo ""',
        'echo "=== PASSOS DO CHATBOT ==="',
        'docker exec $(docker ps -q -f name=supabase_db) psql -U postgres -d postgres -c "SELECT chatbot_id, type, content, position FROM chatbot_steps;" 2>&1',
        'echo ""',
        'echo "=== ÚLTIMAS MENSAGENS RECEBIDAS ==="',
        'docker exec $(docker ps -q -f name=supabase_db) psql -U postgres -d postgres -c "SELECT text, sender, timestamp FROM messages ORDER BY timestamp DESC LIMIT 10;" 2>&1'
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
