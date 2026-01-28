import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Client :: Ready');

    // SQL to force autoconfirm in the database record itself
    const sql = "UPDATE auth.instances SET raw_base_config = raw_base_config || '{\\\"mailer\\\":{\\\"autoconfirm\\\":true, \\\"external_email_enabled\\\":false}}';";

    const cmds = [
        `docker exec -i supabase-db psql -U postgres -d postgres -c "${sql}"`,
        "docker restart supabase-auth",
        "sleep 3",
        "docker logs supabase-auth --tail 20"
    ];

    conn.exec(cmds.join(' && '), (err, stream) => {
        if (err) throw err;
        stream.on('data', (d) => console.log('OUT: ' + d));
        stream.stderr.on('data', (d) => console.log('ERR: ' + d));
        stream.on('close', () => {
            console.log('SQL force approach finished.');
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
