import pg from 'pg';

async function test() {
    const config = {
        host: '135.181.37.206',
        port: 5432,
        user: 'postgres',
        password: 'umrivvELEseN',
        database: 'postgres',
        ssl: false
    };
    const client = new pg.Client(config);
    try {
        await client.connect();
        console.log(`✅ Success with root password!`);
        await client.end();
    } catch (err) {
        console.log(`❌ Fail with root password - ${err.message}`);
    }
}

test();
