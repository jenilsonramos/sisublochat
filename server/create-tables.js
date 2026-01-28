import pool from './db.js';

async function createTables() {
    console.log('🚀 Starting Database Initialization...');

    try {
        // 1. Check Connection
        const [connTest] = await pool.query('SELECT current_user, current_database()');
        console.log(`✅ Connected as: ${connTest[0].current_user} to database: ${connTest[0].current_database}`);

        // 2. Enable pgcrypto (for gen_random_uuid)
        console.log('📦 Enabling pgcrypto extension...');
        await pool.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

        // 3. Create Instances Table
        console.log('📋 Creating instances table...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS instances (
                id uuid NOT NULL DEFAULT gen_random_uuid(),
                name text UNIQUE NOT NULL,
                status text DEFAULT 'connecting',
                created_at timestamp with time zone DEFAULT now(),
                CONSTRAINT instances_pkey PRIMARY KEY (id)
            )
        `);

        // 4. Create System Settings Table
        console.log('⚙️ Creating system_settings table...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS system_settings (
                id integer PRIMARY KEY DEFAULT 1,
                api_url text,
                api_key text,
                updated_at timestamp with time zone DEFAULT now(),
                CONSTRAINT system_settings_id_check CHECK (id = 1)
            )
        `);

        // 5. Create Campaigns Table
        console.log('📋 Creating campaigns table...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS campaigns (
                id uuid NOT NULL DEFAULT gen_random_uuid(),
                user_id uuid,
                instance_id uuid,
                name text NOT NULL,
                message_template text,
                min_delay integer DEFAULT 15,
                max_delay integer DEFAULT 45,
                total_messages integer DEFAULT 0,
                sent_messages integer DEFAULT 0,
                error_messages integer DEFAULT 0,
                status text DEFAULT 'PENDING',
                scheduled_at timestamp with time zone,
                created_at timestamp with time zone DEFAULT now(),
                updated_at timestamp with time zone DEFAULT now(),
                CONSTRAINT campaigns_pkey PRIMARY KEY (id),
                CONSTRAINT campaigns_instance_id_fkey FOREIGN KEY (instance_id) REFERENCES instances(id)
            )
        `);

        // 6. Create Campaign Messages Table
        console.log('📧 Creating campaign_messages table...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS campaign_messages (
                id uuid NOT NULL DEFAULT gen_random_uuid(),
                campaign_id uuid NOT NULL,
                remote_jid text NOT NULL,
                variables jsonb DEFAULT '{}'::jsonb,
                status text DEFAULT 'PENDING',
                sent_at timestamp with time zone,
                error_message text,
                created_at timestamp with time zone DEFAULT now(),
                CONSTRAINT campaign_messages_pkey PRIMARY KEY (id),
                CONSTRAINT campaign_messages_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
            )
        `);

        console.log('✅ Tables created successfully!');

    } catch (e) {
        console.error('❌ Error creating tables:', e);
        if (e.message.includes('permission denied')) {
            console.error('💡 TIP: Try giving the user superuser permissions or run manually as postgres.');
        }
    } finally {
        process.exit(0);
    }
}

createTables();
