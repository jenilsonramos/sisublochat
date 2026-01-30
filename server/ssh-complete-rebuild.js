import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor de Produção');

    const cmd = `
echo "=== REBUILD COMPLETO DO FRONTEND ==="
cd /root/ublochat

# Limpar cache de build
rm -rf dist node_modules/.vite

# Verificar .env
echo "=== .ENV ==="
cat .env

echo ""
echo "=== REBUILDING ==="
npm run build

echo ""
echo "=== VERIFICANDO CHAVES NO NOVO BUILD ==="
grep -oE "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+" dist/assets/*.js | head -3

echo ""
echo "=== REINICIANDO CONTAINER ==="
docker compose restart 2>/dev/null || docker-compose restart

echo ""
echo "=== STATUS ==="
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
