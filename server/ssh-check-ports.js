import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor de Produção');

    const cmd = `
echo "=== PM2 LIST ==="
pm2 list

echo ""
echo "=== PM2 DESCRIBE ALL ==="
pm2 describe 0 2>/dev/null | head -40

echo ""
echo "=== PORTAS EM USO ==="
netstat -tlnp | grep -E "(node|pm2|3000|3001|80|443)"

echo ""
echo "=== NGINX OU CADDY? ==="
which nginx && nginx -t
which caddy && caddy version
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
