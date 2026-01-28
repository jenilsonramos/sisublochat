import pg from 'pg';

const config = {
    host: '135.181.37.206',
    port: 5432,
    user: 'postgres',
    password: 'R8mF9kP2sQ4VxA7ZLwC3eT',
    database: 'postgres',
    ssl: false
};

const { Client } = pg;
const client = new Client(config);

async function test() {
    console.log('Testing direct IP connection to 5432...');
    try {
        await client.connect();
        console.log('✅ Connected successfully!');
        const res = await client.query('SELECT current_user, current_database()');
        console.log('User:', res.rows[0].current_user, 'DB:', res.rows[0].current_database);
        await client.end();
    } catch (err) {
        console.error('❌ Connection failed:', err.message);
    }
}

test();
