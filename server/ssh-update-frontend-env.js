import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor de Produção');

    const cmd = `
echo "=== CRIANDO .ENV CORRETO ==="
cat > /root/ublochat/.env << 'EOF'
VITE_SUPABASE_URL=https://banco.ublochat.com.br
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ewogICJyb2xlIjogImFub24iLAogICJpc3MiOiAic3VwYWJhc2UiLAogICJpYXQiOiAxNzE1MDUwODAwLAogICJleHAiOiAxODcyODE3MjAwCn0.IEHlSEhCYXk6E3QO785siSA5KGdmfWq_UH25z_MLuqA
VITE_WEBHOOK_URL=https://api.ublochat.com.br/webhook-server
EOF

echo ""
echo "=== VERIFICANDO .ENV ==="
cat /root/ublochat/.env

echo ""
echo "=== RECONSTRUINDO FRONTEND ==="
cd /root/ublochat
npm run build

echo ""
echo "=== REBUILDING DOCKER ==="
docker compose down 2>/dev/null || docker-compose down
docker compose up -d --build 2>/dev/null || docker-compose up -d --build

echo ""
echo "=== STATUS FINAL ==="
docker ps --format "table {{.Names}}\t{{.Status}}" | grep ublochat
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
}).connect({ host: '77.42.84.214', port: 22, username: 'root', password: 'X4cusMK3tHWv', readyTimeout: 120000 });
