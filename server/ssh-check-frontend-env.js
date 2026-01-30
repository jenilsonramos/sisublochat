import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor Produção');

    const cmd = `
echo "=== .ENV DO FRONTEND ==="
cat /root/ublochat/.env

echo ""
echo "=== VARIÁVEIS COMPILADAS NO DIST ==="
grep -r "VITE_SUPABASE" /root/ublochat/dist/assets/*.js 2>/dev/null | head -c 500 || echo "Não encontrado em JS"
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
