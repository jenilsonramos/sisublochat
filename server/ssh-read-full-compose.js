import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado');

    conn.exec('cat /root/ublochat/docker-compose.prod.yml | head -100', (err, stream) => {
        if (err) throw err;

        let output = '';
        stream.on('data', (data) => output += data.toString());
        stream.on('close', () => {
            console.log('=== DOCKER-COMPOSE.PROD.YML (primeiras 100 linhas) ===');
            console.log(output);
            console.log('=======================================================');
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
