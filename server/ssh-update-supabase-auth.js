import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Client :: Ready');

    // Path found: /root/supabase/apps/studio/.env (Wait, studio?) 
    // Usually it's in /root/supabase/docker/.env or similar. 
    // Let's check /root/supabase/.env first.

    const envFile = "/root/supabase/.env";

    const cmds = [
        `sed -i 's/ENABLE_EMAIL_AUTOCONFIRM=false/ENABLE_EMAIL_AUTOCONFIRM=true/g' ${envFile}`,
        `sed -i 's/GOTRUE_MAILER_AUTOCONFIRM=false/GOTRUE_MAILER_AUTOCONFIRM=true/g' ${envFile}`,
        `sed -i 's/ENABLE_EMAIL_SIGNUP=true/ENABLE_EMAIL_SIGNUP=true/g' ${envFile}`, // Ensure signup is on
        "cd /root/supabase && docker compose restart auth"
    ];

    conn.exec(cmds.join(' && '), (err, stream) => {
        if (err) throw err;
        stream.on('data', (d) => console.log('OUT: ' + d));
        stream.on('stderr', (d) => console.log('ERR: ' + d));
        stream.on('close', () => {
            console.log('Update finished.');
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
