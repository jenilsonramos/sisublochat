import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Client :: Ready');

    // Command to find exactly where the auth service is defined and its env file
    const cmd = "cat /root/supabase/docker/docker-compose.yml | grep -A 20 'auth:'";

    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        let output = '';
        stream.on('data', (d) => output += d.toString());
        stream.on('close', () => {
            console.log('---- AUTH SERVICE DEFINITION ----');
            console.log(output);
            console.log('---------------------------------');
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
