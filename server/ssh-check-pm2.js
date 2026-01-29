import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor de Produção');

    const cmd = `
echo "=== PM2 STATUS ==="
pm2 status

echo ""
echo "=== PM2 LOGS RECENTES ==="
pm2 logs --lines 30 --nostream 2>/dev/null || echo "Could not get logs"

echo ""  
echo "=== ESTRUTURA /root/ublochat ==="
ls -la /root/ublochat/

echo ""
echo "=== PACKAGE.JSON SCRIPTS ==="
cat /root/ublochat/package.json | grep -A 20 '"scripts"'
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
