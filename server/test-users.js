import pg from 'pg';

const usernameVariations = [
    'postgres.postgres',
    'postgres.default',
    'postgres',
    'supabase_admin.postgres',
    'supabase_admin'
];

async function test(user) {
    const config = {
        host: '135.181.37.206',
        port: 5432,
        user: user,
        password: 'R8mF9kP2sQ4VxA7ZLwC3eT',
        database: 'postgres',
        ssl: false
    };
    const client = new pg.Client(config);
    try {
        await client.connect();
        console.log(`✅ Success with user: ${user}`);
        await client.end();
        return true;
    } catch (err) {
        console.log(`❌ Fail with user: ${user} - ${err.message}`);
        return false;
    }
}

async function run() {
    for (const u of usernameVariations) {
        if (await test(u)) break;
    }
}

run();
