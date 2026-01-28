import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Client :: Ready');

    const envFile = "/root/supabase/docker/.env";

    const cmds = [
        "cd /root/supabase/docker",
        "rm -f docker-compose.override.yml", // Clean up failed attempts
        `echo "" >> ${envFile}`,
        `echo "GOTRUE_MAILER_AUTOCONFIRM=true" >> ${envFile}`,
        `echo "GOTRUE_SMS_AUTOCONFIRM=true" >> ${envFile}`,
        `echo "GOTRUE_EXTERNAL_EMAIL_ENABLED=false" >> ${envFile}`,
        "docker compose up -d auth",
        "docker compose restart auth",
        "sleep 5",
        "docker exec supabase-auth env | grep AUTOCONFIRM"
    ];

    conn.exec(cmds.join(' && '), (err, stream) => {
        if (err) throw err;
        stream.on('data', (d) => console.log('OUT: ' + d));
        stream.stderr.on('data', (d) => console.log('ERR: ' + d));
        stream.on('close', () => {
            console.log('Final append approach finished.');
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
