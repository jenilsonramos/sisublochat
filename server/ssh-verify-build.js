import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor de Produção');

    const cmd = `
echo "=== VERIFICANDO .ENV ATUAL ==="
cat /root/ublochat/.env

echo ""
echo "=== VERIFICANDO SE CHAVE ESTÁ NO BUILD ==="
grep -r "ewogICJyb2xlIjogImFub24i" /root/ublochat/dist/assets/*.js 2>/dev/null && echo "✅ Chave CORRETA encontrada no build" || echo "❌ Chave correta NÃO encontrada"

echo ""
echo "=== VERIFICANDO QUAL CHAVE ESTÁ NO BUILD ==="
grep -oE "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+" /root/ublochat/dist/assets/*.js 2>/dev/null | head -3

echo ""
echo "=== VERIFICANDO URL DO SUPABASE NO BUILD ==="
grep -o "banco.ublochat.com.br" /root/ublochat/dist/assets/*.js 2>/dev/null | head -1 || echo "URL não encontrada no build"
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
