import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor Supabase');

    // Extract keys and test query
    const cmd = `
cd /root/supabase/docker
ANON_KEY=$(grep "^ANON_KEY=" .env | cut -d'=' -f2)
SERVICE_ROLE_KEY=$(grep "^SERVICE_ROLE_KEY=" .env | cut -d'=' -f2)

echo "Testing Profiles Query with ANON_KEY..."
curl -v -X GET "http://localhost:8000/rest/v1/profiles?select=role&id=eq.12345678-1234-1234-1234-1234567890ab" \\
  -H "apikey: $ANON_KEY" \\
  -H "Authorization: Bearer $ANON_KEY"
`;

    conn.exec(cmd, (err, stream) => {
        if (err) throw err;

        let output = '';
        stream.on('data', (data) => output += data.toString());
        stream.stderr.on('data', (data) => output += data.toString());
        stream.on('close', () => {
            console.log('=== TESTE DE API (CURL) ===');
            console.log(output);
            conn.end();
        });
    });
}).connect({ host: '194.163.189.247', port: 22, username: 'root', password: 'zlPnsbN8y37?Xyaw', readyTimeout: 120000 });
