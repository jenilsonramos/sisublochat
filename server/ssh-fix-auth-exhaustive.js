import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Client :: Ready on DB Server');

    // We will set EVERY possible variable that could cause this
    const envFile = "/root/supabase/docker/.env";

    const cmds = [
        "cd /root/supabase/docker",
        // Enable autoconfirm and disable external mailers if possible
        `sed -i 's/GOTRUE_MAILER_AUTOCONFIRM=.*/GOTRUE_MAILER_AUTOCONFIRM=true/g' ${envFile}`,
        `echo "ENABLE_EMAIL_AUTOCONFIRM=true" >> ${envFile}`,
        `echo "GOTRUE_EXTERNAL_EMAIL_ENABLED=false" >> ${envFile}`,
        `echo "GOTRUE_MAILER_SECURE_EMAIL_CHANGE_ENABLED=false" >> ${envFile}`,
        // Restart everything in that folder
        "docker compose up -d --force-recreate auth",
        "docker compose restart auth",
        "sleep 5",
        "docker logs supabase-auth --tail 20"
    ];

    conn.exec(cmds.join(' && '), (err, stream) => {
        if (err) throw err;
        stream.on('data', (d) => console.log('OUT: ' + d));
        stream.stderr.on('data', (d) => console.log('ERR: ' + d));
        stream.on('close', () => {
            console.log('Final Auth Fix applied.');
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
