import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Client :: Ready');

    const envFile = "/root/supabase/docker/.env";

    // Using a more aggressive sed to ensure replacement
    const cmds = [
        `sed -i 's/GOTRUE_MAILER_AUTOCONFIRM=false/GOTRUE_MAILER_AUTOCONFIRM=true/g' ${envFile}`,
        `sed -i 's/GOTRUE_SMS_AUTOCONFIRM=false/GOTRUE_SMS_AUTOCONFIRM=true/g' ${envFile}`,
        "cd /root/supabase/docker && docker compose restart auth",
        "sleep 5",
        "docker exec supabase-auth env | grep AUTOCONFIRM"
    ];

    conn.exec(cmds.join(' && '), (err, stream) => {
        if (err) throw err;
        stream.on('data', (d) => console.log('OUT: ' + d));
        stream.stderr.on('data', (d) => console.log('ERR: ' + d));
        stream.on('close', () => {
            console.log('Final check finished.');
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
