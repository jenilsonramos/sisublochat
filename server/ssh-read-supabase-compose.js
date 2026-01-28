import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Client :: Ready');

    // Read the auth service section of docker-compose
    const cmd = "cat /root/supabase/docker/docker-compose.yml";

    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        let output = '';
        stream.on('data', (d) => output += d.toString());
        stream.on('close', () => {
            console.log('---- DOCKER COMPOSE CONTENT ----');
            console.log(output);
            console.log('-------------------------------');
            conn.end();
        });
    });
}).connect({
    host: '135.181.37.206',
    port: 22,
    username: 'root',
    password: 'sv97TRbvFxjf'
});

conn.on('error', (err) => {
    console.error('❌ SSH Error:', err.message);
});
