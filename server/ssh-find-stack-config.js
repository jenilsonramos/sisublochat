import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado');

    // Check the stack compose file to see how realtime is configured
    conn.exec('find /root -name "*.yml" -type f 2>/dev/null | xargs grep -l "realtime" 2>/dev/null | head -3', (err, stream) => {
        if (err) throw err;

        let files = '';
        stream.on('data', (data) => files += data.toString());
        stream.on('close', () => {
            console.log('=== ARQUIVOS QUE CONFIGURAM REALTIME ===');
            console.log(files);

            if (files.trim()) {
                const firstFile = files.split('\n')[0].trim();
                conn.exec(`cat "${firstFile}" 2>/dev/null | head -200`, (err2, stream2) => {
                    let content = '';
                    stream2.on('data', (d) => content += d.toString());
                    stream2.on('close', () => {
                        console.log('\n=== CONTEÚDO ===');
                        console.log(content.substring(0, 5000));
                        conn.end();
                    });
                });
            } else {
                conn.end();
            }
        });
    });
}).connect({
    host: '194.163.189.247',
    port: 22,
    username: 'root',
    password: 'zlPnsbN8y37?Xyaw',
    readyTimeout: 60000
});
