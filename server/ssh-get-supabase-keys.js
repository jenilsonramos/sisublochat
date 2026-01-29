import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor Supabase');

    const cmd = `
echo "=== SUPABASE ENV ==="
cat /root/supabase/.env | grep -E "(ANON|JWT|SERVICE_ROLE)" | head -10

echo ""
echo "=== KONG CONFIG ==="
docker exec $(docker ps -q -f name=supabase_kong) cat /home/kong/kong.yml 2>/dev/null | grep -A5 "anon" | head -20
`;

    conn.exec(cmd, (err, stream) => {
        if (err) throw err;

        let output = '';
        stream.on('data', (data) => output += data.toString());
        stream.stderr.on('data', (data) => output += data.toString());
        stream.on('close', () => {
            console.log(output);
            conn.end();
        });
    });
}).connect({ host: '194.163.189.247', port: 22, username: 'root', password: 'zlPnsbN8y37?Xyaw', readyTimeout: 120000 });
