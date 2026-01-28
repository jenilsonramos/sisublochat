import { Client } from 'ssh2';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', '20260128000000_full_schema.sql');
const sqlContent = fs.readFileSync(sqlPath, 'utf8');

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Client :: Ready');

    const dbContainer = 'supabase-db';
    console.log(`🚀 Running migration on ${dbContainer}...`);

    const stream = conn.exec(`docker exec -i ${dbContainer} psql -U postgres -d postgres`, (err, stream) => {
        if (err) throw err;

        stream.on('close', (code, signal) => {
            console.log('Migration finished with code: ' + code);

            // Now create admin user
            console.log('👤 Creating admin user...');
            const adminSql = `
                -- Create user in auth.users if not exists
                -- We use a simplified insert because we don't have the full supabase auth helper here
                -- But usually self-hosted supabase has a dashboard or we can use the API
                -- Let's try to insert into public.profiles directly if the user exists in auth.users
                -- OR we can try to use a tool to create it via API later.
                -- For now, let's just ensure the schema is there.
            `;
            conn.end();
        }).on('data', (data) => {
            console.log('OUT: ' + data);
        }).stderr.on('data', (data) => {
            console.log('ERR: ' + data);
        });

        // Write the SQL content to the psql stdin
        stream.write(sqlContent);
        stream.end('\n\\q\n'); // End with quit command
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
