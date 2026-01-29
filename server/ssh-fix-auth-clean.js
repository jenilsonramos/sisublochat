import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Client :: Ready');

    const envFile = "/root/supabase/docker/.env";

    const cmds = [
        "cd /root/supabase/docker",
        // Precise replacement
        `sed -i 's/GOTRUE_MAILER_AUTOCONFIRM=.*/GOTRUE_MAILER_AUTOCONFIRM=true/g' ${envFile}`,
        `sed -i 's/GOTRUE_SMS_AUTOCONFIRM=.*/GOTRUE_SMS_AUTOCONFIRM=true/g' ${envFile}`,
        // Extra variables for safety
        `grep -q "ENABLE_EMAIL_AUTOCONFIRM" ${envFile} || echo "ENABLE_EMAIL_AUTOCONFIRM=true" >> ${envFile}`,
        `grep -q "GOTRUE_EXTERNAL_EMAIL_ENABLED" ${envFile} || echo "GOTRUE_EXTERNAL_EMAIL_ENABLED=false" >> ${envFile}`,
        // Restart
        "docker compose up -d --force-recreate auth",
        "sleep 5",
        "docker exec supabase-auth env | grep AUTOCONFIRM"
    ];

    conn.exec(cmds.join(' && '), (err, stream) => {
        if (err) throw err;
        stream.on('data', (d) => console.log('OUT: ' + d));
        stream.stderr.on('data', (d) => console.log('ERR: ' + d));
        stream.on('close', () => {
            console.log('Final clean Auth Fix applied.');
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
