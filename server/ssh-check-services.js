import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor de Produção');

    const cmd = `
echo "=== SERVIÇOS ATIVOS ==="
systemctl list-units --type=service --state=running | grep -E "(nginx|apache|caddy|node|pm2)" 

echo ""
echo "=== PM2 LIST ==="
pm2 list 2>/dev/null || echo "PM2 not installed"

echo ""
echo "=== NGINX CONFIG ==="
cat /etc/nginx/sites-enabled/default 2>/dev/null || cat /etc/nginx/nginx.conf 2>/dev/null || echo "No nginx config"

echo ""
echo "=== PROCESSOS NODE ==="
ps aux | grep node | head -10
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
