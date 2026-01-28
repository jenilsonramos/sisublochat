import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Client :: Ready');

    // Inject the variable directly into the docker-compose environment section
    // We'll target the 'auth:' service
    const cmds = [
        "cd /root/supabase/docker",
        // This is a bit risky with sed on YAML, but let's try to add it after the environment: key for auth
        "sed -i '/auth:/,/environment:/ s/environment:/environment:\\n      GOTRUE_MAILER_AUTOCONFIRM: \"true\"/' docker-compose.yml",
        "sed -i '/auth:/,/environment:/ s/environment:/environment:\\n      GOTRUE_SMS_AUTOCONFIRM: \"true\"/' docker-compose.yml",
        "docker compose up -d",
        "sleep 5",
        "docker exec supabase-auth env | grep AUTOCONFIRM"
    ];

    conn.exec(cmds.join(' && '), (err, stream) => {
        if (err) throw err;
        stream.on('data', (d) => console.log('OUT: ' + d));
        stream.stderr.on('data', (d) => console.log('ERR: ' + d));
        stream.on('close', () => {
            console.log('Docker compose update finished.');
            conn.end();
        });
    });
}).connect({
    host: '135.181.37.206',
    port: 22,
    username: 'root',
    password: 'sv97TRbvFxjf',
    readyTimeout: 30000
});

conn.on('error', (err) => {
    console.error('❌ SSH Error:', err.message);
});
