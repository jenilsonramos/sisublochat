import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Client :: Ready on DB Server');

    // Commands to disable email confirmation in GoTrue (Auth)
    const sql = `
        -- Disable email confirmation requirement
        UPDATE auth.instances SET raw_base_config = raw_base_config || '{"mailer":{"autoconfirm":true}}' WHERE id = '00000000-0000-0000-0000-000000000000';
        
        -- Also set it in the config if it's a newer version using specific columns
        -- But usually updating the instance config is enough for self-hosted
        
        -- Alternatively, we can try to find and update the auth settings if they are in a different table
        -- For most Supabase docker setups, we need to restart the 'auth' container after changes if they are in the .env
        -- But let's verify if we can do it via SQL first.
    `;

    const dbContainer = 'supabase-db';

    conn.exec(`docker exec -i ${dbContainer} psql -U postgres -d postgres -c "${sql}"`, (err, stream) => {
        if (err) throw err;
        stream.on('data', (d) => console.log('OUT: ' + d));
        stream.on('stderr', (d) => console.log('ERR: ' + d));
        stream.on('close', () => {
            console.log('Auth config updated via SQL.');

            // Now restart the auth container to ensure it picks up changes if necessary
            console.log('Restarting auth container...');
            conn.exec('docker restart supabase-auth', (err2, stream2) => {
                if (err2) throw err2;
                stream2.on('close', () => {
                    console.log('Auth container restarted.');
                    conn.end();
                });
            });
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
