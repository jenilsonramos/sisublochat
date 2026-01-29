import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ Conectado ao servidor');

    // List docker stacks and services
    const cmds = [
        'docker stack ls',
        'docker service ls',
        'docker ps -a'
    ];

    conn.exec(cmds.join(' && echo "---" && '), (err, stream) => {
        if (err) throw err;

        let output = '';
        stream.on('data', (data) => output += data.toString());
        stream.on('close', () => {
            console.log(output);
            conn.end();
        });
    });
}).connect({
    host: '194.163.189.247',
    port: 22,
    username: 'root',
    password: 'zlPnsbN8y37?Xyaw'
});
