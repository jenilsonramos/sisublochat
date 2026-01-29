import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor de produção');

    conn.exec('base64 /root/ublochat/Caddyfile', (err, stream) => {
        if (err) throw err;

        let output = '';
        stream.on('data', (data) => output += data.toString());
        stream.stderr.on('data', (data) => output += data.toString());
        stream.on('close', () => {
            const decoded = Buffer.from(output.trim(), 'base64').toString('utf8');
            console.log('=== CADDYFILE DECODIFICADO ===');
            console.log(decoded);
            conn.end();
        });
    });
}).connect({
    host: '77.42.84.214',
    port: 22,
    username: 'root',
    password: 'heagkwqejgxh',
    readyTimeout: 60000
});
