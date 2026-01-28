import pg from 'pg';

const config = {
    host: 'banco.ublochat.com.br',
    port: 6432,
    user: 'postgres.postgres',
    password: 'R8mF9kP2sQ4VxA7ZLwC3eT',
    database: 'postgres',
    ssl: false
};

const { Client } = pg;
const client = new Client(config);

async function test() {
    console.log('Testing connection to port 6432...');
    try {
        await client.connect();
        console.log('✅ Connected successfully to 6432!');
        const res = await client.query('SELECT NOW()');
        console.log('Time:', res.rows[0].now);
        await client.end();
    } catch (err) {
        console.error('❌ Connection failed on 6432:', err.message);
    }
}

test();
