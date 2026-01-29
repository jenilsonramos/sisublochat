import { Client } from 'ssh2';
import fs from 'fs';
import path from 'path';

const conn = new Client();

// Read the migration SQL file
const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', '20260128000000_full_schema.sql');
let migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

conn.on('ready', () => {
    console.log('✅ SSH Conectado');

    // Find the supabase_db container (from supabase stack)
    conn.exec('docker ps --filter "name=supabase_supabase_db" --format "{{.Names}}" | head -1', (err, stream) => {
        if (err) throw err;

        let containerName = '';
        stream.on('data', (data) => containerName += data.toString().trim());
        stream.on('close', () => {
            console.log('📦 Container encontrado:', containerName || '(vazio, tentando alternativo)');

            // If not found, try different name patterns
            if (!containerName) {
                conn.exec('docker ps --format "{{.Names}}" | grep -i supabase | grep -i db | head -1', (err, stream2) => {
                    let altName = '';
                    stream2.on('data', (d) => altName += d.toString().trim());
                    stream2.on('close', () => {
                        if (altName) {
                            containerName = altName;
                            console.log('📦 Container alternativo:', containerName);
                        }
                        runMigration(containerName);
                    });
                });
            } else {
                runMigration(containerName);
            }
        });
    });

    function runMigration(containerName) {
        if (!containerName) {
            console.log('❌ Container supabase_db não encontrado!');
            conn.end();
            return;
        }

        // Upload the SQL file
        conn.sftp((err, sftp) => {
            if (err) throw err;

            console.log('📁 Enviando arquivo SQL...');
            const writeStream = sftp.createWriteStream('/tmp/supabase_migration.sql');
            writeStream.write(migrationSQL);
            writeStream.end();

            writeStream.on('close', () => {
                console.log('✅ Arquivo enviado');

                // Copy to container and execute with the correct password
                const cmds = [
                    `docker cp /tmp/supabase_migration.sql ${containerName}:/tmp/migration.sql`,
                    `docker exec ${containerName} psql -U postgres -d postgres -f /tmp/migration.sql 2>&1 | tail -100`
                ];

                console.log('🚀 Executando migração no container supabase_db...');

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
                                console.log('\n📋 TABELAS NO BANCO SUPABASE:');
                                console.log(tables);
                                conn.end();
                            });
                        });
                    });
                });
            });
        });
    }
}).connect({
    host: '194.163.189.247',
    port: 22,
    username: 'root',
    password: 'zlPnsbN8y37?Xyaw',
    readyTimeout: 60000
});
