import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado');

    // Download the docker-compose file via SFTP
    conn.sftp((err, sftp) => {
        if (err) throw err;

        let content = '';
        const readStream = sftp.createReadStream('/root/ublochat/docker-compose.prod.yml');

        readStream.on('data', (chunk) => {
            content += chunk.toString();
        });

        readStream.on('end', () => {
            console.log('=== DOCKER-COMPOSE.PROD.YML COMPLETO ===');
            console.log(content);
            console.log('========================================');
            conn.end();
        });

        readStream.on('error', (err) => {
            console.error('Erro ao ler arquivo:', err.message);
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
