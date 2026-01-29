import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor de Produção');

    // Enter the ublochat container and run git pull
    const cmd = `
docker exec ublochat sh -c "cd /app && git pull origin main && npm run build" 2>&1 || echo "Build inside container failed, trying direct approach..."

# If the above fails, try a direct approach
docker cp ublochat:/app/package.json /tmp/test_package.json 2>/dev/null && cat /tmp/test_package.json | head -5
`;

    conn.exec(cmd, (err, stream) => {
        if (err) throw err;

        let output = '';
        stream.on('data', (data) => output += data.toString());
        stream.stderr.on('data', (data) => output += data.toString());
        stream.on('close', () => {
            console.log('=== RESULTADO DEPLOY FRONTEND ===');
            console.log(output);
            conn.end();
        });
    });
}).connect({ host: '77.42.84.214', port: 22, username: 'root', password: 'X4cusMK3tHWv', readyTimeout: 120000 });
