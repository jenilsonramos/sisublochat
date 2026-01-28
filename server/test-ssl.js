import pg from 'pg';

async function test() {
    const config = {
        host: '135.181.37.206',
        port: 5432,
        user: 'postgres',
        password: 'R8mF9kP2sQ4VxA7ZLwC3eT',
        database: 'postgres',
        ssl: { rejectUnauthorized: false }
    };
    const client = new pg.Client(config);
    try {
        await client.connect();
        console.log(`✅ Success with SSL!`);
        await client.end();
    } catch (err) {
        console.log(`❌ Fail with SSL - ${err.message}`);
    }
}

test();
