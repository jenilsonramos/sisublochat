import { Client } from 'ssh2';
import fs from 'fs';
import path from 'path';

const conn = new Client();

// Read the migration SQL file
const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', '20260128000000_full_schema.sql');
const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

conn.on('ready', () => {
    console.log('✅ SSH Client :: Connected to 194.163.189.247');

    // First, copy the SQL file to the server
    conn.sftp((err, sftp) => {
        if (err) {
            console.error('❌ SFTP Error:', err.message);
            conn.end();
            return;
        }

        console.log('📁 Uploading migration SQL file...');

        const writeStream = sftp.createWriteStream('/tmp/migration.sql');
        writeStream.write(migrationSQL);
        writeStream.end();

        writeStream.on('close', () => {
            console.log('✅ Migration file uploaded to /tmp/migration.sql');

            // Copy the file into the container and execute with correct password
            const cmds = [
                'docker cp /tmp/migration.sql supabase_db:/tmp/migration.sql',
                'docker exec supabase_db psql -U postgres -d postgres -f /tmp/migration.sql'
            ];

            console.log('🚀 Executing migration...');

            conn.exec(cmds.join(' && '), (err, stream) => {
                if (err) {
                    console.error('❌ Exec Error:', err.message);
                    conn.end();
                    return;
                }

                let output = '';
                let errorOutput = '';

                stream.on('data', (data) => {
                    output += data.toString();
                });

                stream.stderr.on('data', (data) => {
                    errorOutput += data.toString();
                });

                stream.on('close', (code) => {
                    console.log('---- MIGRATION OUTPUT ----');
                    console.log(output);
                    if (errorOutput) {
                        console.log('---- ERRORS/NOTICES ----');
                        console.log(errorOutput);
                    }
                    console.log('--------------------------');
                    console.log(`Exit code: ${code}`);

                    if (code === 0) {
                        console.log('✅ Migration completed successfully!');
                    } else {
                        console.log('⚠️ Migration completed with warnings/errors.');
                    }

                    conn.end();
                });
            });
        });

        writeStream.on('error', (err) => {
            console.error('❌ Write Error:', err.message);
            conn.end();
        });
    });
}).connect({
    host: '194.163.189.247',
    port: 22,
    username: 'root',
    password: 'zlPnsbN8y37?Xyaw',
    readyTimeout: 60000
});

conn.on('error', (err) => {
    console.error('❌ SSH Connection Error:', err.message);
});
