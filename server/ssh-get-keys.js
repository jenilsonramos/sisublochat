import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor Supabase');

    const cmd = `
echo "=== VARIÁVEIS DO SUPABASE ==="
cd /root/supabase
cat .env | grep -E "(ANON_KEY|JWT_SECRET|SERVICE_ROLE)" | head -10

echo ""
echo "=== TESTANDO COM CHAVE DO SERVIDOR ==="
ANON_KEY=$(cat .env | grep ANON_KEY | cut -d '=' -f2 | head -1)
echo "Usando chave: $(echo $ANON_KEY | head -c 50)..."
curl -s "https://banco.ublochat.com.br/rest/v1/admin_access?select=email" \
  -H "apikey: $ANON_KEY" 2>&1

echo ""
echo ""
echo "=== CHAVES NO KONG ==="
docker exec $(docker ps -q -f name=supabase_kong) cat /home/kong/kong.yml 2>/dev/null | grep -A 2 "consumers:" | head -10
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
