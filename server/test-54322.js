import pg from 'pg';

async function test() {
    const config = {
        host: '135.181.37.206',
        port: 54322,
        user: 'postgres',
        password: 'R8mF9kP2sQ4VxA7ZLwC3eT',
        database: 'postgres',
        ssl: false
    };
    const client = new pg.Client(config);
    try {
        await client.connect();
        console.log(`✅ Success on 54322!`);
        await client.end();
    } catch (err) {
        console.log(`❌ Fail on 54322 - ${err.message}`);
    }
}

test();
