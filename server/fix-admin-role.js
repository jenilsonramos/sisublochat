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

async function fixAdmin() {
    try {
        const client = await pool.connect();
        const email = 'jenilson@outlook.com.br';

        console.log(`🔧 Fixing admin role for: ${email}`);

        // 1. Update public.profiles
        const resProfile = await client.query(`
            UPDATE public.profiles 
            SET role = 'ADMIN' 
            WHERE email = $1 
            RETURNING id, role
        `, [email]);

        if (resProfile.rowCount > 0) {
            console.log('✅ Updated public.profiles:', resProfile.rows[0]);
        } else {
            console.log('❌ Could not update public.profiles (User not found?)');
        }

        // 2. Update auth.users metadata
        // We need to fetch current metadata first to merge, or just overwrite providing the essential structure.
        // Assuming we just want to set role: 'ADMIN'.

        const resAuth = await client.query(`
            UPDATE auth.users 
            SET 
                raw_app_meta_data = jsonb_set(COALESCE(raw_app_meta_data, '{}'::jsonb), '{role}', '"ADMIN"'),
                raw_user_meta_data = jsonb_set(COALESCE(raw_user_meta_data, '{}'::jsonb), '{role}', '"ADMIN"')
            WHERE email = $1
            RETURNING id, raw_app_meta_data
        `, [email]);

        if (resAuth.rowCount > 0) {
            console.log('✅ Updated auth.users metadata:', resAuth.rows[0].raw_app_meta_data);
        } else {
            console.log('❌ Could not update auth.users');
        }

        client.release();
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}

fixAdmin();
