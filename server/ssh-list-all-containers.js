import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ Conectado ao servidor');

    // List ALL docker containers (including stopped)
    conn.exec('docker ps -a --format "{{.Names}}"', (err, stream) => {
        if (err) throw err;

        let output = '';
        stream.on('data', (data) => output += data.toString());
        stream.on('close', () => {
            console.log('=== TODOS OS CONTAINERS ===');
            console.log(output);
            console.log('===========================');
            conn.end();
        });
    });
}).connect({
    host: '194.163.189.247',
    port: 22,
    username: 'root',
    password: 'zlPnsbN8y37?Xyaw'
});
