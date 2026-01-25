
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

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
    // ssl: { rejectUnauthorized: false } 
});

async function checkSchemas() {
    const client = await pool.connect();
    try {
        console.log('Connected to database!');
        const res = await client.query("SELECT schema_name FROM information_schema.schemata;");
        console.log('Available schemas:', res.rows.map(r => r.schema_name));

        // Check if auth.users exists
        try {
            await client.query("SELECT count(*) FROM auth.users");
            console.log('auth.users table accessible.');
        } catch (e) {
            console.log('Could not access auth.users:', e.message);
        }

    } catch (err) {
        console.error('Connection failed:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

checkSchemas();
