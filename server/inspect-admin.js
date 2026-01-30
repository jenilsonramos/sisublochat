import pg from 'pg';
const { Pool } = pg;

const config = {
    host: 'banco.ublochat.com.br',
    port: 5432,
    user: 'postgres',
    password: '140feba84a688d204e3a2f9945f9cd75',
    database: 'postgres',
    ssl: false
};

const pool = new Pool(config);

async function inspectAdmin() {
    try {
        const client = await pool.connect();
        const email = 'jenilson@outlook.com.br';

        console.log(`🔍 Checking user: ${email}`);

        // Check auth.users
        const resAuth = await client.query('SELECT id, raw_app_meta_data, raw_user_meta_data, role FROM auth.users WHERE email = $1', [email]);
        if (resAuth.rows.length > 0) {
            console.log('Auth User found:', JSON.stringify(resAuth.rows[0], null, 2));
        } else {
            console.log('❌ Auth User NOT found');
        }

        // Check public.profiles
        const resProfile = await client.query('SELECT * FROM public.profiles WHERE email = $1', [email]);
        if (resProfile.rows.length > 0) {
            console.log('Profile found:', JSON.stringify(resProfile.rows[0], null, 2));
        } else {
            console.log('❌ Profile NOT found');
        }

        client.release();
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}

inspectAdmin();
