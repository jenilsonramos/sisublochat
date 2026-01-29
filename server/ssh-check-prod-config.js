import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor de Produção');

    const cmd = `
echo "=== VARIÁVEIS DE AMBIENTE DO FRONTEND ==="
cat /root/ublochat/.env 2>/dev/null || echo "No .env file"
cat /root/ublochat/.env.production 2>/dev/null || echo "No .env.production file"

echo ""
echo "=== CONTEÚDO DO DIST ==="
ls -la /root/ublochat/dist/ 2>/dev/null | head -10

echo ""
echo "=== CONFIGURAÇÃO DO CADDY ==="
cat /etc/caddy/Caddyfile 2>/dev/null | head -50
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
