import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Client :: Ready');

    const envFile = "/root/supabase/docker/.env";

    // Set all possible variables to true and disable mailer
    const configs = [
        "GOTRUE_MAILER_AUTOCONFIRM=true",
        "GOTRUE_SMS_AUTOCONFIRM=true",
        "ENABLE_EMAIL_AUTOCONFIRM=true",
        "ENABLE_SMS_AUTOCONFIRM=true",
        "GOTRUE_MAILER_EXTERNAL_EMAIL_ENABLED=false",
        "GOTRUE_EXTERNAL_EMAIL_ENABLED=false",
        "MAILER_AUTOCONFIRM=true"
    ];

    const cmds = [
        "cd /root/supabase/docker",
        // Append these if they don't exist, or replace if they do
        ...configs.map(c => {
            const [key, val] = c.split('=');
            return `grep -q "${key}" ${envFile} && sed -i "s/${key}=.*/${key}=${val}/g" ${envFile} || echo "${c}" >> ${envFile}`;
        }),
        "docker compose up -d --force-recreate auth",
        "docker compose restart auth",
        "sleep 5",
        "docker exec supabase-auth env | grep -E 'AUTOCONFIRM|EMAIL_ENABLED|MAILER'"
    ];

    conn.exec(cmds.join(' && '), (err, stream) => {
        if (err) throw err;
        stream.on('data', (d) => console.log('OUT: ' + d));
        stream.stderr.on('data', (d) => console.log('ERR: ' + d));
        stream.on('close', () => {
            console.log('Shotgun Auth Fix applied.');
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
