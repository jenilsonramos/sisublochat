import { Client } from 'ssh2';

const conn = new Client();
let fullOutput = '';

conn.on('ready', () => {
    console.log('✅ SSH Client :: Ready');

    const dbContainer = 'supabase-db';

    // Check tables and create admin
    const sql = `
        SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';
        
        -- Create admin user
        DO $$
        DECLARE
          uid uuid := gen_random_uuid();
        BEGIN
          -- Check if user exists first to avoid duplicate errors
          IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'jenilson@outlook.com.br') THEN
            INSERT INTO auth.users (
              instance_id,
              id,
              aud,
              role,
              email,
              encrypted_password,
              email_confirmed_at,
              raw_app_meta_data,
              raw_user_meta_data,
              created_at,
              updated_at,
              is_super_admin
            ) VALUES (
              '00000000-0000-0000-0000-000000000000',
              uid,
              'authenticated',
              'authenticated',
              'jenilson@outlook.com.br',
              -- Using a dummy hash for now, better to use the actual bcrypt if possible
              -- but usually pgcrypto is available
              crypt('125714Ab#', gen_salt('bf')),
              now(),
              '{"provider":"email","providers":["email"],"role":"ADMIN"}',
              '{"full_name":"Jenilson Ramos"}',
              now(),
              now(),
              true
            );
          ELSE
            UPDATE auth.users 
            SET raw_app_meta_data = raw_app_meta_data || '{"role":"ADMIN"}',
                is_super_admin = true
            WHERE email = 'jenilson@outlook.com.br';
          END IF;
        END $$;
    `;

    const stream = conn.exec(`docker exec -i ${dbContainer} psql -U postgres -d postgres`, (err, stream) => {
        if (err) throw err;
        stream.on('data', (d) => console.log('OUT: ' + d));
        stream.on('stderr', (d) => console.log('ERR: ' + d));
        stream.on('close', () => {
            console.log('Post-migration check and admin creation finished.');
            conn.end();
        });
        stream.write(sql);
        stream.end('\n\\q\n');
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
