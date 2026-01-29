import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor de Produção');

    const cmd = `
echo "=== REINICIANDO SERVIÇOS ==="
cd /root/ublochat

echo "Parando serviços..."
pm2 stop all 2>/dev/null || echo "PM2 not running"

echo ""
echo "Iniciando preview do build (produção)..."
pm2 start "npm run preview -- --host 0.0.0.0 --port 3001" --name "ublochat-frontend" 2>/dev/null || npm run preview -- --host 0.0.0.0 --port 3001 &

echo ""
echo "=== PM2 STATUS FINAL ==="
pm2 status
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
}).connect({ host: '77.42.84.214', port: 22, username: 'root', password: 'X4cusMK3tHWv', readyTimeout: 120000 });
