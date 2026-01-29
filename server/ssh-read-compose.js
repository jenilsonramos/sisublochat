import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado');

    // Read the full docker-compose
    conn.exec('cat /root/ublochat/docker-compose.prod.yml', (err, stream) => {
        if (err) throw err;

        let output = '';
        stream.on('data', (data) => output += data.toString());
        stream.on('close', () => {
            console.log('=== DOCKER-COMPOSE.PROD.YML COMPLETO ===');
            console.log(output);
            console.log('========================================');
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
