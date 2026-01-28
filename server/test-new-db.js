import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const config = {
    host: 'banco.ublochat.com.br',
    port: 5432,
    user: 'postgres',
    password: 'R8mF9kP2sQ4VxA7ZLwC3eT',
    database: 'postgres',
    ssl: false
};

const { Client } = pg;
const client = new Client(config);

async function test() {
    console.log('Testing connection to:', config.host);
    try {
        await client.connect();
        console.log('✅ Connected successfully!');
        const res = await client.query('SELECT NOW()');
        console.log('Time from DB:', res.rows[0].now);
        await client.end();
    } catch (err) {
        console.error('❌ Connection failed:', err.message);
        process.exit(1);
    }
}

test();
