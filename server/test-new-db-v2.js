import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

// Trying Supavisor format: postgres.[tenant_id]
const config = {
    host: 'banco.ublochat.com.br',
    port: 5432,
    user: 'postgres.postgres', // Format for Supavisor
    password: 'R8mF9kP2sQ4VxA7ZLwC3eT',
    database: 'postgres',
    ssl: false
};

const { Client } = pg;
const client = new Client(config);

async function test() {
    console.log('Testing connection to:', config.host, 'as', config.user);
    try {
        await client.connect();
        console.log('✅ Connected successfully!');
        const res = await client.query('SELECT NOW()');
        console.log('Time from DB:', res.rows[0].now);
        await client.end();
    } catch (err) {
        console.error('❌ Connection failed:', err.message);

        // Try without the .postgres suffix if it fails
        console.log('Retrying without .postgres suffix...');
        const client2 = new Client({ ...config, user: 'postgres' });
        try {
            await client2.connect();
            console.log('✅ Connected successfully with plain "postgres"!');
            await client2.end();
        } catch (err2) {
            console.error('❌ Second attempt failed:', err2.message);
            process.exit(1);
        }
    }
}

test();
