import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Client :: Ready');

    // Find all .env files and update both possible names for the variable
    const cmds = [
        "find /root/supabase -name '.env' -exec sed -i 's/AUTOCONFIRM=false/AUTOCONFIRM=true/g' {} +",
        "find /root/supabase -name '.env' -exec sed -i 's/ENABLE_EMAIL_AUTOCONFIRM=false/ENABLE_EMAIL_AUTOCONFIRM=true/g' {} +",
        "find /root/supabase -name '.env' -exec sed -i 's/MAILER_AUTOCONFIRM=false/MAILER_AUTOCONFIRM=true/g' {} +",
        "cd /root/supabase/docker && docker compose restart auth"
    ];

    conn.exec(cmds.join(' && '), (err, stream) => {
        if (err) throw err;
        stream.on('data', (d) => console.log('OUT: ' + d));
        stream.stderr.on('data', (d) => console.log('ERR: ' + d));
        stream.on('close', () => {
            console.log('Mass update finished.');
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
