import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor de Produção');

    const cmd = `
echo "=== CADDYFILE ATUAL ==="
cat /etc/caddy/Caddyfile

echo ""
echo "=== LOGS CADDY RECENTES ==="
journalctl -u caddy --no-pager -n 20 2>/dev/null || tail -20 /var/log/caddy/access.log 2>/dev/null || echo "No logs found"
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
