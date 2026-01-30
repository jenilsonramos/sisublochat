import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor Supabase');

    const cmd = `
echo "=== RESPOSTA COMPLETA DO SWAGGER (local) ==="
curl -s "http://localhost:3000/" 2>&1 | cat

echo ""
echo ""
echo "=== LOGS DO SERVIÇO (SWARM) ==="
docker service logs supabase_supabase_rest --no-trunc 2>&1 | tail -50 | grep -iE "(error|warn|fatal|schema)" | tail -20
`;

    conn.exec(cmd, (err, stream) => {
        if (err) throw err;

        let output = '';
        stream.on('data', (data) => { output += data.toString(); });
        stream.stderr.on('data', (data) => { output += data.toString(); });
        stream.on('close', () => {
            console.log(output);
            conn.end();
        });
    });
}).connect({ host: '194.163.189.247', port: 22, username: 'root', password: 'zlPnsbN8y37?Xyaw', readyTimeout: 120000 });
