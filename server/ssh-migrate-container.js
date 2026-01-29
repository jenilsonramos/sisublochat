import { Client } from 'ssh2';
import fs from 'fs';
import path from 'path';

const conn = new Client();

// Read the migration SQL file
const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', '20260128000000_full_schema.sql');
let migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

// Remove FK references to auth.users since it may not exist
migrationSQL = migrationSQL
    .replace(/REFERENCES auth\.users\(id\)[^,]*/g, '')
    .replace(/CONSTRAINT profiles_id_fkey FOREIGN KEY \(id\)[^,]*/g, '')
    .replace(/CONSTRAINT ai_settings_user_id_fkey FOREIGN KEY \(user_id\)[^,]*/g, '')
    .replace(/CONSTRAINT api_keys_user_id_fkey FOREIGN KEY \(user_id\)[^,]*/g, '')
    .replace(/CONSTRAINT away_messages_sent_user_id_fkey FOREIGN KEY \(user_id\)[^,]*/g, '')
    .replace(/CONSTRAINT blocked_resources_user_id_fkey FOREIGN KEY \(user_id\)[^,]*/g, '')
    .replace(/CONSTRAINT business_hours_user_id_fkey FOREIGN KEY \(user_id\)[^,]*/g, '')
    .replace(/CONSTRAINT contact_lists_user_id_fkey FOREIGN KEY \(user_id\)[^,]*/g, '')
    .replace(/CONSTRAINT contacts_user_id_fkey FOREIGN KEY \(user_id\)[^,]*/g, '')
    .replace(/CONSTRAINT integrations_user_id_fkey FOREIGN KEY \(user_id\)[^,]*/g, '')
    .replace(/CONSTRAINT instances_user_id_fkey FOREIGN KEY \(user_id\)[^,]*/g, '')
    .replace(/CONSTRAINT subscriptions_user_id_fkey FOREIGN KEY \(user_id\)[^,]*/g, '')
    .replace(/CONSTRAINT flows_user_id_fkey FOREIGN KEY \(user_id\)[^,]*/g, '')
    .replace(/CONSTRAINT chatbots_user_id_fkey FOREIGN KEY \(user_id\)[^,]*/g, '')
    .replace(/CONSTRAINT campaigns_user_id_fkey FOREIGN KEY \(user_id\)[^,]*/g, '')
    .replace(/CONSTRAINT conversations_user_id_fkey FOREIGN KEY \(user_id\)[^,]*/g, '');

conn.on('ready', () => {
    console.log('✅ SSH Conectado');

    // First, get the exact container name
    conn.exec('docker ps --filter "name=postgres" --format "{{.Names}}" | head -1', (err, stream) => {
        if (err) throw err;

        let containerName = '';
        stream.on('data', (data) => containerName += data.toString().trim());
        stream.on('close', () => {
            console.log('📦 Container encontrado:', containerName);

            if (!containerName) {
                console.log('❌ Nenhum container postgres encontrado!');
                conn.end();
                return;
            }

            // Upload the SQL file
            conn.sftp((err, sftp) => {
                if (err) throw err;

                console.log('📁 Enviando arquivo SQL...');
                const writeStream = sftp.createWriteStream('/tmp/migration.sql');
                writeStream.write(migrationSQL);
                writeStream.end();

                writeStream.on('close', () => {
                    console.log('✅ Arquivo enviado');

                    // Copy to container and execute
                    const cmds = [
                        `docker cp /tmp/migration.sql ${containerName}:/tmp/migration.sql`,
                        `docker exec ${containerName} psql -U postgres -d postgres -f /tmp/migration.sql 2>&1 | tail -50`
                    ];

                    console.log('🚀 Executando migração no container...');

                    conn.exec(cmds.join(' && '), (err, stream2) => {
                        if (err) throw err;

                        let output = '';
                        stream2.on('data', (data) => output += data.toString());
                        stream2.stderr.on('data', (data) => output += data.toString());
                        stream2.on('close', (code) => {
                            console.log('--- OUTPUT ---');
                            console.log(output);
                            console.log('--------------');
                            console.log(`Exit code: ${code}`);

                            // Check tables
                            conn.exec(`docker exec ${containerName} psql -U postgres -d postgres -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;"`, (err, stream3) => {
                                let tables = '';
                                stream3.on('data', (d) => tables += d.toString());
                                stream3.on('close', () => {
                                    console.log('\n📋 TABELAS NO BANCO:');
                                    console.log(tables);
                                    conn.end();
                                });
                            });
                        });
                    });
                });
            });
        });
    });
}).connect({
    host: '194.163.189.247',
    port: 22,
    username: 'root',
    password: 'zlPnsbN8y37?Xyaw',
    readyTimeout: 60000
});
