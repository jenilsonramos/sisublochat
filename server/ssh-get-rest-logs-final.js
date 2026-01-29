import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor Supabase');

    // Find the REST container name and get its logs
    const cmd = "docker ps --format '{{.Names}}' | grep rest";

    conn.exec(cmd, (err, stream) => {
        if (err) throw err;

        let restContainerName = '';
        stream.on('data', (data) => restContainerName += data.toString());
        stream.on('close', () => {
            restContainerName = restContainerName.trim();
            if (restContainerName) {
                console.log(`Found REST container: ${restContainerName}`);
                conn.exec(`docker logs ${restContainerName} --tail 100`, (err2, stream2) => {
                    if (err2) throw err2;
                    let logs = '';
                    stream2.on('data', (data) => logs += data.toString());
                    stream2.stderr.on('data', (data) => logs += data.toString());
                    stream2.on('close', () => {
                        console.log('=== LOGS POSTGREST ===');
                        console.log(logs);
                        conn.end();
                    });
                });
            } else {
                console.log('REST container not found via grep rest.');
                conn.end();
            }
        });
    });
}).connect({ host: '194.163.189.247', port: 22, username: 'root', password: 'zlPnsbN8y37?Xyaw', readyTimeout: 120000 });
