import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Client :: Ready');

    // Read the whole file and print it
    const cmd = "cat /root/supabase/docker/docker-compose.yml";

    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        let output = '';
        stream.on('data', (d) => output += d.toString());
        stream.on('close', () => {
            console.log('START_OF_FILE');
            console.log(output);
            console.log('END_OF_FILE');
            conn.end();
        });
    });
}).connect({
    host: '135.181.37.206',
    port: 22,
    username: 'root',
    password: 'sv97TRbvFxjf',
    readyTimeout: 60000
});

conn.on('error', (err) => {
    console.error('❌ SSH Error:', err.message);
});
