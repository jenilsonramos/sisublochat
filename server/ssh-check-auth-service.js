import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor Supabase');

    const cmd = `
echo "=== SERVIÇOS SUPABASE ==="
docker service ls 2>/dev/null | grep supabase

echo ""
echo "=== LOGS DO SERVIÇO AUTH (GoTrue) ==="
docker service logs supabase_supabase_auth --tail 50 2>&1 | tail -30

echo ""
echo "=== TESTANDO AUTH ENDPOINT DIRETAMENTE ==="
curl -s "https://banco.ublochat.com.br/auth/v1/health" 2>&1
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
