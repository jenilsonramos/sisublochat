
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const { Pool } = pg;

const pool = new Pool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 5432,
    // ssl: { rejectUnauthorized: false } // Try without SSL for plain Docker
});

async function runMigration() {
    const client = await pool.connect();
    try {
        const sqlPath = path.resolve(__dirname, '../supabase_migration.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('Running migration...');
        // Split commands by semicolon to handle basic multi-statement script if needed, 
        // but pg usually handles it. However, Supabase migration files often contain transactions or special commands.
        // Let's try running as a single query first.
        await client.query(sql);
        console.log('Migration completed successfully.');
    } catch (err) {
        console.error('Migration failed:', err);
        console.error('Error details:', JSON.stringify(err, null, 2));
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

runMigration();
