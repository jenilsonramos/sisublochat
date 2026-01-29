import pg from 'pg';

const { Client } = pg;

// Connect directly to PostgreSQL
const client = new Client({
    host: '194.163.189.247',
    port: 5432,
    user: 'postgres',
    password: '8a38315997f2c27d65e06422bda8c63e',
    database: 'postgres',
    ssl: false
});

async function runMigration() {
    try {
        console.log('🔌 Conectando ao PostgreSQL...');
        await client.connect();
        console.log('✅ Conectado!');

        // Enable pgcrypto extension
        console.log('🔧 Habilitando extensão pgcrypto...');
        await client.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');

        // Create tables WITHOUT foreign keys to auth.users first
        const tables = [
            // 1. Admin Settings
            `CREATE TABLE IF NOT EXISTS public.admin_settings (
                id uuid NOT NULL DEFAULT gen_random_uuid(),
                key text NOT NULL UNIQUE,
                value text,
                description text,
                category text,
                created_at timestamp with time zone DEFAULT now(),
                updated_at timestamp with time zone DEFAULT now(),
                CONSTRAINT admin_settings_pkey PRIMARY KEY (id)
            );`,

            // 2. Debug Logs
            `CREATE SEQUENCE IF NOT EXISTS debug_logs_id_seq;`,
            `CREATE TABLE IF NOT EXISTS public.debug_logs (
                id integer NOT NULL DEFAULT nextval('debug_logs_id_seq'::regclass),
                created_at timestamp with time zone DEFAULT now(),
                content text,
                CONSTRAINT debug_logs_pkey PRIMARY KEY (id)
            );`,

            // 3. Email Templates
            `CREATE TABLE IF NOT EXISTS public.email_templates (
                id uuid NOT NULL DEFAULT gen_random_uuid(),
                slug text NOT NULL UNIQUE,
                subject text NOT NULL,
                body text NOT NULL,
                variables jsonb DEFAULT '[]'::jsonb,
                created_at timestamp with time zone DEFAULT now(),
                updated_at timestamp with time zone DEFAULT now(),
                CONSTRAINT email_templates_pkey PRIMARY KEY (id)
            );`,

            // 4. Billing Settings
            `CREATE TABLE IF NOT EXISTS public.billing_settings (
                id uuid NOT NULL DEFAULT gen_random_uuid(),
                smtp_host text,
                smtp_port integer DEFAULT 587,
                smtp_user text,
                smtp_pass text,
                from_email text,
                from_name text DEFAULT 'Ublo Chat Billing',
                reminder_3d_subject text DEFAULT 'Seu plano vence em 3 dias',
                reminder_3d_body text,
                reminder_2d_subject text DEFAULT 'Seu plano vence em 2 dias',
                reminder_2d_body text,
                reminder_0d_subject text DEFAULT 'Seu plano vence HOJE',
                reminder_0d_body text,
                expiry_subject text DEFAULT 'Seu plano expirou',
                expiry_body text,
                blockage_subject text DEFAULT 'Funcionalidades Bloqueadas',
                blockage_body text,
                created_at timestamp with time zone DEFAULT now(),
                updated_at timestamp with time zone DEFAULT now(),
                CONSTRAINT billing_settings_pkey PRIMARY KEY (id)
            );`,

            // 5. Cron Jobs
            `CREATE TABLE IF NOT EXISTS public.cron_jobs (
                id uuid NOT NULL DEFAULT gen_random_uuid(),
                name text NOT NULL,
                job_type text NOT NULL,
                cron_job_id integer UNIQUE,
                schedule text,
                enabled boolean DEFAULT true,
                last_run timestamp with time zone,
                created_at timestamp with time zone DEFAULT now(),
                CONSTRAINT cron_jobs_pkey PRIMARY KEY (id)
            );`,

            // 6. Plans
            `CREATE TABLE IF NOT EXISTS public.plans (
                id uuid NOT NULL DEFAULT gen_random_uuid(),
                name text NOT NULL,
                description text,
                price numeric NOT NULL,
                max_instances integer DEFAULT 1,
                max_contacts integer DEFAULT 100,
                max_chatbots integer DEFAULT 1,
                features jsonb DEFAULT '[]'::jsonb,
                is_public boolean DEFAULT true,
                created_at timestamp with time zone DEFAULT now(),
                cycle text DEFAULT 'monthly',
                stripe_price_id text,
                mercado_pago_id text,
                status text DEFAULT 'ACTIVE',
                max_users integer DEFAULT 1,
                ai_enabled boolean DEFAULT false,
                stripe_product_id text,
                CONSTRAINT plans_pkey PRIMARY KEY (id)
            );`,

            // 7. System Settings
            `CREATE TABLE IF NOT EXISTS public.system_settings (
                id uuid NOT NULL DEFAULT gen_random_uuid(),
                api_url text,
                api_key text,
                webhook_url text,
                created_at timestamp with time zone DEFAULT now(),
                updated_at timestamp with time zone DEFAULT now(),
                system_instance text,
                test_phone text,
                captcha_provider text DEFAULT 'none',
                captcha_site_key text,
                captcha_secret_key text,
                maintenance_mode boolean DEFAULT false,
                maintenance_return_time timestamp with time zone,
                cron_api_key text,
                cron_job_id text,
                seo_title text,
                seo_description text,
                seo_keywords text,
                favicon_url text,
                og_image_url text,
                robots_txt text,
                footer_text text,
                CONSTRAINT system_settings_pkey PRIMARY KEY (id)
            );`,

            // 8. Profiles (WITHOUT FK to auth.users)
            `CREATE TABLE IF NOT EXISTS public.profiles (
                id uuid NOT NULL,
                full_name text,
                email text,
                role text DEFAULT 'OPERATOR',
                status text DEFAULT 'ACTIVE',
                avatar_url text,
                created_at timestamp with time zone DEFAULT now(),
                updated_at timestamp with time zone DEFAULT now(),
                whatsapp text,
                recovery_code text,
                recovery_expiry timestamp with time zone,
                stripe_customer_id text,
                CONSTRAINT profiles_pkey PRIMARY KEY (id)
            );`,

            // 9. AI Settings
            `CREATE TABLE IF NOT EXISTS public.ai_settings (
                id uuid NOT NULL DEFAULT gen_random_uuid(),
                user_id uuid NOT NULL UNIQUE,
                api_key text,
                model text DEFAULT 'gemini-1.5-flash',
                system_prompt text DEFAULT 'Você é um assistente prestativo.',
                enabled boolean DEFAULT false,
                created_at timestamp with time zone DEFAULT now(),
                updated_at timestamp with time zone DEFAULT now(),
                temperature double precision DEFAULT 0.7,
                max_tokens integer DEFAULT 800,
                history_limit integer DEFAULT 5,
                provider text DEFAULT 'gemini',
                CONSTRAINT ai_settings_pkey PRIMARY KEY (id)
            );`,

            // 10. API Keys
            `CREATE TABLE IF NOT EXISTS public.api_keys (
                id uuid NOT NULL DEFAULT gen_random_uuid(),
                user_id uuid NOT NULL,
                name text NOT NULL,
                key text NOT NULL UNIQUE,
                created_at timestamp with time zone DEFAULT now(),
                last_used_at timestamp with time zone,
                CONSTRAINT api_keys_pkey PRIMARY KEY (id)
            );`,

            // 11. Away Messages Sent
            `CREATE TABLE IF NOT EXISTS public.away_messages_sent (
                id uuid NOT NULL DEFAULT gen_random_uuid(),
                user_id uuid,
                remote_jid text NOT NULL,
                sent_at timestamp with time zone DEFAULT now(),
                CONSTRAINT away_messages_sent_pkey PRIMARY KEY (id)
            );`,

            // 12. Blocked Resources
            `CREATE TABLE IF NOT EXISTS public.blocked_resources (
                id uuid NOT NULL DEFAULT gen_random_uuid(),
                user_id uuid NOT NULL,
                resource_type text NOT NULL,
                resource_id uuid NOT NULL,
                created_at timestamp with time zone DEFAULT now(),
                CONSTRAINT blocked_resources_pkey PRIMARY KEY (id)
            );`,

            // 13. Business Hours
            `CREATE TABLE IF NOT EXISTS public.business_hours (
                id uuid NOT NULL DEFAULT gen_random_uuid(),
                user_id uuid UNIQUE,
                enabled boolean DEFAULT false,
                away_message text NOT NULL DEFAULT 'Olá! No momento estamos fora do horário de atendimento.',
                monday_enabled boolean DEFAULT true,
                monday_start time without time zone DEFAULT '08:00:00',
                monday_end time without time zone DEFAULT '18:00:00',
                tuesday_enabled boolean DEFAULT true,
                tuesday_start time without time zone DEFAULT '08:00:00',
                tuesday_end time without time zone DEFAULT '18:00:00',
                wednesday_enabled boolean DEFAULT true,
                wednesday_start time without time zone DEFAULT '08:00:00',
                wednesday_end time without time zone DEFAULT '18:00:00',
                thursday_enabled boolean DEFAULT true,
                thursday_start time without time zone DEFAULT '08:00:00',
                thursday_end time without time zone DEFAULT '18:00:00',
                friday_enabled boolean DEFAULT true,
                friday_start time without time zone DEFAULT '08:00:00',
                friday_end time without time zone DEFAULT '18:00:00',
                saturday_enabled boolean DEFAULT false,
                saturday_start time without time zone DEFAULT '09:00:00',
                saturday_end time without time zone DEFAULT '13:00:00',
                sunday_enabled boolean DEFAULT false,
                sunday_start time without time zone DEFAULT '09:00:00',
                sunday_end time without time zone DEFAULT '13:00:00',
                timezone text DEFAULT 'America/Sao_Paulo',
                created_at timestamp with time zone DEFAULT now(),
                updated_at timestamp with time zone DEFAULT now(),
                CONSTRAINT business_hours_pkey PRIMARY KEY (id)
            );`,

            // 14. Contact Lists
            `CREATE TABLE IF NOT EXISTS public.contact_lists (
                id uuid NOT NULL DEFAULT gen_random_uuid(),
                user_id uuid NOT NULL,
                name text NOT NULL,
                created_at timestamp with time zone DEFAULT now(),
                CONSTRAINT contact_lists_pkey PRIMARY KEY (id)
            );`,

            // 15. Contacts
            `CREATE TABLE IF NOT EXISTS public.contacts (
                id uuid NOT NULL DEFAULT gen_random_uuid(),
                user_id uuid,
                name text NOT NULL,
                remote_jid text NOT NULL UNIQUE,
                avatar_url text,
                email text,
                notes text,
                created_at timestamp with time zone DEFAULT now(),
                tags text[] DEFAULT '{}',
                CONSTRAINT contacts_pkey PRIMARY KEY (id)
            );`,

            // 16. Integrations
            `CREATE TABLE IF NOT EXISTS public.integrations (
                id uuid NOT NULL DEFAULT gen_random_uuid(),
                user_id uuid NOT NULL,
                type text NOT NULL,
                credentials jsonb NOT NULL DEFAULT '{}',
                is_active boolean DEFAULT true,
                created_at timestamp with time zone DEFAULT now(),
                updated_at timestamp with time zone DEFAULT now(),
                CONSTRAINT integrations_pkey PRIMARY KEY (id)
            );`,

            // 17. Instances
            `CREATE TABLE IF NOT EXISTS public.instances (
                id uuid NOT NULL DEFAULT gen_random_uuid(),
                name text NOT NULL,
                status text DEFAULT 'DISCONNECTED',
                battery integer,
                identifier text NOT NULL UNIQUE,
                type text DEFAULT 'whatsapp',
                user_id uuid,
                created_at timestamp with time zone DEFAULT now(),
                sector text DEFAULT 'Comercial',
                owner_jid text,
                channel_type text DEFAULT 'evolution',
                CONSTRAINT instances_pkey PRIMARY KEY (id)
            );`,

            // 18. Subscriptions
            `CREATE TABLE IF NOT EXISTS public.subscriptions (
                id uuid NOT NULL DEFAULT gen_random_uuid(),
                user_id uuid NOT NULL UNIQUE,
                plan_id uuid NOT NULL,
                status text NOT NULL DEFAULT 'active',
                current_period_end timestamp with time zone,
                created_at timestamp with time zone DEFAULT now(),
                updated_at timestamp with time zone DEFAULT now(),
                current_period_start timestamp with time zone DEFAULT now(),
                stripe_subscription_id text,
                cancel_at_period_end boolean DEFAULT false,
                CONSTRAINT subscriptions_pkey PRIMARY KEY (id)
            );`,

            // 19. Payment Logs
            `CREATE TABLE IF NOT EXISTS public.payment_logs (
                id uuid NOT NULL DEFAULT gen_random_uuid(),
                user_id uuid,
                amount numeric NOT NULL,
                currency text DEFAULT 'BRL',
                method text,
                status text,
                external_id text,
                created_at timestamp with time zone DEFAULT now(),
                CONSTRAINT payment_logs_pkey PRIMARY KEY (id)
            );`,

            // 20. Billing Notifications Log
            `CREATE TABLE IF NOT EXISTS public.billing_notifications_log (
                id uuid NOT NULL DEFAULT gen_random_uuid(),
                subscription_id uuid,
                notification_type text NOT NULL,
                sent_at timestamp with time zone DEFAULT now(),
                CONSTRAINT billing_notifications_log_pkey PRIMARY KEY (id)
            );`,

            // 21. Flows
            `CREATE TABLE IF NOT EXISTS public.flows (
                id uuid NOT NULL DEFAULT gen_random_uuid(),
                user_id uuid NOT NULL,
                name text NOT NULL,
                description text,
                nodes jsonb NOT NULL DEFAULT '[]',
                edges jsonb NOT NULL DEFAULT '[]',
                status text DEFAULT 'DRAFT',
                created_at timestamp with time zone DEFAULT now(),
                updated_at timestamp with time zone DEFAULT now(),
                instance_id uuid,
                trigger_type text DEFAULT 'any',
                trigger_keyword text,
                CONSTRAINT flows_pkey PRIMARY KEY (id)
            );`,

            // 22. Chatbots
            `CREATE TABLE IF NOT EXISTS public.chatbots (
                id uuid NOT NULL DEFAULT gen_random_uuid(),
                name text NOT NULL,
                trigger text,
                instance_id uuid,
                status text DEFAULT 'ACTIVE',
                last_run timestamp with time zone,
                type text DEFAULT 'SIMPLE',
                user_id uuid,
                created_at timestamp with time zone DEFAULT now(),
                match_type text DEFAULT 'contains',
                description text,
                updated_at timestamp with time zone DEFAULT now(),
                CONSTRAINT chatbots_pkey PRIMARY KEY (id)
            );`,

            // 23. Campaigns
            `CREATE TABLE IF NOT EXISTS public.campaigns (
                id uuid NOT NULL DEFAULT gen_random_uuid(),
                user_id uuid NOT NULL,
                instance_id uuid NOT NULL,
                name text NOT NULL,
                message_template text NOT NULL,
                status text NOT NULL DEFAULT 'PENDING',
                min_delay integer DEFAULT 10,
                max_delay integer DEFAULT 30,
                scheduled_at timestamp with time zone,
                created_at timestamp with time zone DEFAULT now(),
                updated_at timestamp with time zone DEFAULT now(),
                total_messages integer DEFAULT 0,
                sent_messages integer DEFAULT 0,
                error_messages integer DEFAULT 0,
                CONSTRAINT campaigns_pkey PRIMARY KEY (id)
            );`,

            // 24. WhatsApp Official Resources
            `CREATE TABLE IF NOT EXISTS public.whatsapp_official_resources (
                id uuid NOT NULL DEFAULT gen_random_uuid(),
                instance_id uuid NOT NULL UNIQUE,
                phone_number_id text NOT NULL,
                business_account_id text NOT NULL,
                access_token text NOT NULL,
                verify_token text NOT NULL,
                created_at timestamp with time zone DEFAULT now(),
                CONSTRAINT whatsapp_official_resources_pkey PRIMARY KEY (id)
            );`,

            // 25. Chatbot Steps
            `CREATE TABLE IF NOT EXISTS public.chatbot_steps (
                id uuid NOT NULL DEFAULT gen_random_uuid(),
                chatbot_id uuid,
                type text NOT NULL,
                content text NOT NULL,
                delay integer DEFAULT 2,
                simulate_typing boolean DEFAULT true,
                "order" integer NOT NULL,
                created_at timestamp with time zone DEFAULT now(),
                next_step_id uuid,
                CONSTRAINT chatbot_steps_pkey PRIMARY KEY (id)
            );`,

            // 26. Campaign Messages
            `CREATE TABLE IF NOT EXISTS public.campaign_messages (
                id uuid NOT NULL DEFAULT gen_random_uuid(),
                campaign_id uuid NOT NULL,
                remote_jid text NOT NULL,
                variables jsonb DEFAULT '{}',
                status text NOT NULL DEFAULT 'PENDING',
                sent_at timestamp with time zone,
                error_message text,
                created_at timestamp with time zone DEFAULT now(),
                CONSTRAINT campaign_messages_pkey PRIMARY KEY (id)
            );`,

            // 27. Contact List Members
            `CREATE TABLE IF NOT EXISTS public.contact_list_members (
                list_id uuid NOT NULL,
                contact_id uuid NOT NULL,
                created_at timestamp with time zone DEFAULT now(),
                CONSTRAINT contact_list_members_pkey PRIMARY KEY (list_id, contact_id)
            );`,

            // 28. Conversations
            `CREATE TABLE IF NOT EXISTS public.conversations (
                id uuid NOT NULL DEFAULT gen_random_uuid(),
                contact_name text NOT NULL,
                contact_avatar text,
                last_message text,
                last_message_time timestamp with time zone,
                unread_count integer DEFAULT 0,
                online boolean DEFAULT false,
                instance_id uuid,
                user_id uuid,
                created_at timestamp with time zone DEFAULT now(),
                remote_jid text,
                status text DEFAULT 'pending',
                is_blocked boolean DEFAULT false,
                last_greeted_at timestamp with time zone,
                last_flow_at timestamp with time zone,
                current_flow_id uuid,
                current_node_id text,
                variables jsonb DEFAULT '{}',
                assigned_agent_id uuid,
                assigned_at timestamp with time zone,
                protocol text,
                CONSTRAINT conversations_pkey PRIMARY KEY (id)
            );`,

            // 29. Messages
            `CREATE TABLE IF NOT EXISTS public.messages (
                id uuid NOT NULL DEFAULT gen_random_uuid(),
                conversation_id uuid,
                text text NOT NULL,
                sender text NOT NULL,
                status text DEFAULT 'sent',
                timestamp timestamp with time zone DEFAULT now(),
                created_at timestamp with time zone DEFAULT now(),
                media_url text,
                media_type text,
                mimetype text,
                filename text,
                wamid text,
                quoted_id uuid,
                CONSTRAINT messages_pkey PRIMARY KEY (id)
            );`
        ];

        console.log('📦 Criando tabelas...');
        let count = 0;
        for (const sql of tables) {
            try {
                await client.query(sql);
                count++;
            } catch (err) {
                if (!err.message.includes('already exists')) {
                    console.log(`⚠️ ${err.message.substring(0, 80)}`);
                }
            }
        }
        console.log(`✅ ${count} statements executados`);

        // Add indexes
        const indexes = [
            `CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);`,
            `CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON public.messages(timestamp);`,
            `CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON public.conversations(user_id);`,
            `CREATE INDEX IF NOT EXISTS idx_conversations_instance_id ON public.conversations(instance_id);`,
            `CREATE INDEX IF NOT EXISTS idx_conversations_remote_jid ON public.conversations(remote_jid);`,
            `CREATE INDEX IF NOT EXISTS idx_campaigns_status ON public.campaigns(status);`,
            `CREATE INDEX IF NOT EXISTS idx_campaigns_scheduled_at ON public.campaigns(scheduled_at);`,
            `CREATE INDEX IF NOT EXISTS idx_campaign_messages_status ON public.campaign_messages(status);`,
            `CREATE INDEX IF NOT EXISTS idx_contacts_remote_jid ON public.contacts(remote_jid);`,
            `CREATE INDEX IF NOT EXISTS idx_instances_identifier ON public.instances(identifier);`,
            `CREATE INDEX IF NOT EXISTS idx_chatbots_instance_id ON public.chatbots(instance_id);`,
            `CREATE INDEX IF NOT EXISTS idx_flows_instance_id ON public.flows(instance_id);`
        ];

        console.log('📊 Criando índices...');
        for (const sql of indexes) {
            try { await client.query(sql); } catch (e) { }
        }

        // Insert default data
        console.log('📝 Inserindo dados iniciais...');
        try {
            await client.query(`
                INSERT INTO public.plans (name, description, price, max_instances, max_contacts, max_chatbots, max_users, ai_enabled)
                SELECT 'Plano Básico', 'Plano inicial com recursos básicos', 0, 1, 100, 1, 1, false
                WHERE NOT EXISTS (SELECT 1 FROM public.plans WHERE name = 'Plano Básico');
            `);
            await client.query(`
                INSERT INTO public.plans (name, description, price, max_instances, max_contacts, max_chatbots, max_users, ai_enabled)
                SELECT 'Plano Pro', 'Plano profissional com mais recursos', 99.90, 5, 1000, 10, 5, true
                WHERE NOT EXISTS (SELECT 1 FROM public.plans WHERE name = 'Plano Pro');
            `);
            await client.query(`
                INSERT INTO public.system_settings (api_url, api_key)
                SELECT 'https://api.ublochat.com.br', ''
                WHERE NOT EXISTS (SELECT 1 FROM public.system_settings);
            `);
            await client.query(`
                INSERT INTO public.billing_settings (from_name)
                SELECT 'Ublo Chat Billing'
                WHERE NOT EXISTS (SELECT 1 FROM public.billing_settings);
            `);
        } catch (e) {
            console.log('⚠️ Dados iniciais já existem ou erro:', e.message.substring(0, 50));
        }

        // List tables
        const result = await client.query(`
            SELECT tablename FROM pg_tables 
            WHERE schemaname = 'public' 
            ORDER BY tablename;
        `);

        console.log(`\n✅ MIGRAÇÃO CONCLUÍDA!`);
        console.log(`📋 Tabelas criadas (${result.rows.length}):`);
        result.rows.forEach((row, i) => console.log(`   ${i + 1}. ${row.tablename}`));

    } catch (err) {
        console.error('❌ Erro:', err.message);
    } finally {
        await client.end();
    }
}

runMigration();
