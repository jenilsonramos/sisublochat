import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Client :: Ready');

    // Using a more reliable way to update the JSONB config
    const sql = `
DO $$
BEGIN
    UPDATE auth.instances 
    SET raw_base_config = jsonb_set(
        jsonb_set(raw_base_config, '{mailer,autoconfirm}', 'true'),
        '{mailer,external_email_enabled}', 'false'
    );
END $$;
`;

    // Write SQL to a temp file on the server first to avoid escaping hell
    const cmds = [
        `echo "${sql.replace(/"/g, '\\"')}" > /tmp/fix_auth.sql`,
        "docker exec -i supabase-db psql -U postgres -d postgres -f /tmp/fix_auth.sql",
        "docker restart supabase-auth",
        "sleep 5",
        "docker logs supabase-auth --tail 30"
    ];

    conn.exec(cmds.join(' && '), (err, stream) => {
        if (err) throw err;
        stream.on('data', (d) => console.log('OUT: ' + d));
        stream.stderr.on('data', (d) => console.log('ERR: ' + d));
        stream.on('close', () => {
            console.log('JSONB SQL approach finished.');
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
