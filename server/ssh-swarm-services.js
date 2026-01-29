import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ Conectado ao servidor');

    // Full list of services and stacks
    const cmd = `docker service ls --format "{{.Name}}: {{.Replicas}}"`;

    conn.exec(cmd, (err, stream) => {
        if (err) throw err;

        let output = '';
        stream.on('data', (data) => output += data.toString());
        stream.on('close', () => {
            console.log('=== SERVIÇOS DOCKER SWARM ===');
            console.log(output);
            console.log('=============================');
            conn.end();
        });
    });
}).connect({
    host: '194.163.189.247',
    port: 22,
    username: 'root',
    password: 'zlPnsbN8y37?Xyaw'
});
