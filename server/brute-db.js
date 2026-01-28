import pg from 'pg';

const ports = [5432, 5433, 6432];
const users = ['postgres', 'postgres.postgres', 'supabase_admin'];

async function test(port, user) {
    const config = {
        host: '135.181.37.206',
        port: port,
        user: user,
        password: 'R8mF9kP2sQ4VxA7ZLwC3eT',
        database: 'postgres',
        ssl: false
    };
    const client = new pg.Client(config);
    try {
        await client.connect();
        console.log(`✅ SUCCESS: Port ${port}, User ${user}`);
        await client.end();
        return true;
    } catch (err) {
        console.log(`❌ FAIL: Port ${port}, User ${user} - ${err.message}`);
        return false;
    }
}

async function run() {
    for (const p of ports) {
        for (const u of users) {
            if (await test(p, u)) return;
        }
    }
}

run();
