import pg from 'pg';

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
        console.log('✅ Connected successfully to Hostname!');
        const res = await client.query('SELECT NOW()');
        console.log('Time from DB:', res.rows[0].now);
        await client.end();
    } catch (err) {
        console.error('❌ Connection failed with Hostname:', err.message);

        // Try user format: postgres.postgres
        console.log('Retrying with user "postgres.postgres"...');
        const client2 = new Client({ ...config, user: 'postgres.postgres' });
        try {
            await client2.connect();
            console.log('✅ Connected successfully with "postgres.postgres"!');
            await client2.end();
        } catch (err2) {
            console.error('❌ Second attempt failed:', err2.message);
        }
    }
}

test();
