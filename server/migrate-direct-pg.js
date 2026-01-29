import pg from 'pg';
import fs from 'fs';
import path from 'path';

const { Client } = pg;

// Read the migration SQL file
const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', '20260128000000_full_schema.sql');
const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

// Connect directly to PostgreSQL
const client = new Client({
    host: '194.163.189.247',
    port: 5432,
    user: 'postgres',
    password: '8a38315997f2c27d65e06422bda8c63e',
    database: 'postgres',
    ssl: false
});

async function runMigration() {
    try {
        console.log('🔌 Conectando ao PostgreSQL em 194.163.189.247:5432...');
        await client.connect();
        console.log('✅ Conectado ao PostgreSQL!');

        console.log('🚀 Executando migração...');

        // Split into statements and execute each
        const statements = migrationSQL
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));

        let successCount = 0;
        let errorCount = 0;

        for (const statement of statements) {
            try {
                await client.query(statement);
                successCount++;
            } catch (err) {
                // Log but continue - some statements might fail due to already existing
                if (!err.message.includes('already exists') && !err.message.includes('duplicate')) {
                    console.log(`⚠️ Warning: ${err.message.substring(0, 100)}`);
                }
                errorCount++;
            }
        }

        console.log(`\n✅ Migração concluída!`);
        console.log(`   - Statements executados com sucesso: ${successCount}`);
        console.log(`   - Warnings/Errors (podem ser normais): ${errorCount}`);

        // List tables created
        const result = await client.query(`
            SELECT tablename FROM pg_tables 
            WHERE schemaname = 'public' 
            ORDER BY tablename;
        `);

        console.log(`\n📋 Tabelas no schema public (${result.rows.length}):`);
        result.rows.forEach((row, i) => {
            console.log(`   ${i + 1}. ${row.tablename}`);
        });

    } catch (err) {
        console.error('❌ Erro:', err.message);
    } finally {
        await client.end();
        console.log('\n🔌 Conexão fechada.');
    }
}

runMigration();
