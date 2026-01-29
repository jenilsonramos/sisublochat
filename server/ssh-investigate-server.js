import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor de Produção');

    // List all containers with full output and check home directory
    const cmd = `
echo "=== TODOS OS CONTAINERS ==="
docker ps -a --format "{{.Names}} - {{.Image}}"

echo ""
echo "=== DIRETÓRIO HOME ==="
ls -la /home/

echo ""
echo "=== DIRETÓRIO ROOT ==="
ls -la /root/

echo ""
echo "=== BUSCANDO PACKAGE.JSON ==="
find /home /root -name "package.json" -not -path "*/node_modules/*" 2>/dev/null | head -10
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
