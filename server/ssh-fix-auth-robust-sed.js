import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Client :: Ready');

    const envFile = "/root/supabase/docker/.env";

    // Find if the key exists, if not append it. If it exists, replace it.
    const cmds = [
        `grep -q "GOTRUE_MAILER_AUTOCONFIRM" ${envFile} && sed -i 's/GOTRUE_MAILER_AUTOCONFIRM=.*/GOTRUE_MAILER_AUTOCONFIRM=true/g' ${envFile} || echo "GOTRUE_MAILER_AUTOCONFIRM=true" >> ${envFile}`,
        "cd /root/supabase/docker && docker compose stop auth && docker compose up -d auth",
        "sleep 5",
        "docker logs supabase-auth --tail 20"
    ];

    conn.exec(cmds.join(' && '), (err, stream) => {
        if (err) throw err;
        stream.on('data', (d) => console.log('OUT: ' + d));
        stream.stderr.on('data', (d) => console.log('ERR: ' + d));
        stream.on('close', () => {
            console.log('Robust sed approach finished.');
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
