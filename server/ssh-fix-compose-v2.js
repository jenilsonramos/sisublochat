import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Client :: Ready');

    // Read the file with line numbers to find the mess
    const cmd = "cat -n /root/supabase/docker/docker-compose.yml | sed -n '100,160p'";

    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        let output = '';
        stream.on('data', (d) => output += d.toString());
        stream.on('close', () => {
            console.log('---- DOCKER COMPOSE AROUND ERROR ----');
            console.log(output);
            console.log('------------------------------------');
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
