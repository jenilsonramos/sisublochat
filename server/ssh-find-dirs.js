import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor de Produção');

    // List root directories to find website
    const cmd = `
ls -la /
ls -la /www 2>/dev/null || echo "No /www"
ls -la /home 2>/dev/null || echo "No /home"
ls -la /var/www 2>/dev/null || echo "No /var/www"
find / -name "evolutionapi" -type d 2>/dev/null | head -5
find / -name "package.json" 2>/dev/null | head -10
`;

    conn.exec(cmd, (err, stream) => {
        if (err) throw err;

        let output = '';
        stream.on('data', (data) => output += data.toString());
        stream.stderr.on('data', (data) => output += data.toString());
        stream.on('close', () => {
            console.log('=== ESTRUTURA DO SERVIDOR ===');
            console.log(output);
            conn.end();
        });
    });
}).connect({ host: '77.42.84.214', port: 22, username: 'root', password: 'X4cusMK3tHWv', readyTimeout: 120000 });
