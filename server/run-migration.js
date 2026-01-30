import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const config = {
    host: process.env.DB_HOST || 'banco.ublochat.com.br',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASS || 'R8mF9kP2sQ4VxA7ZLwC3eT',
    database: process.env.DB_NAME || 'postgres',
    ssl: (process.env.DB_SSL === 'true')
};

console.log(`🚀 Iniciando migração incremental...`);
console.log(`📡 Conectando a: ${config.host}:${config.port}`);

const { Pool } = pg;
const pool = new Pool(config);

// Migração dividida em partes
const migrations = [
    // Parte 1 - Extensões e tabelas independentes
    {
        name: 'Extensões e Tabelas Base',
        sql: `
            CREATE EXTENSION IF NOT EXISTS "pgcrypto";
            
            CREATE TABLE IF NOT EXISTS public.admin_settings (
                id uuid NOT NULL DEFAULT gen_random_uuid(),
                key text NOT NULL UNIQUE,
                value text,
                description text,
                category text,
                created_at timestamp with time zone DEFAULT now(),
                updated_at timestamp with time zone DEFAULT now(),
                CONSTRAINT admin_settings_pkey PRIMARY KEY (id)
            );
            
            CREATE SEQUENCE IF NOT EXISTS debug_logs_id_seq;
            CREATE TABLE IF NOT EXISTS public.debug_logs (
                id integer NOT NULL DEFAULT nextval('debug_logs_id_seq'::regclass),
                created_at timestamp with time zone DEFAULT now(),
                content text,
                CONSTRAINT debug_logs_pkey PRIMARY KEY (id)
            );
            
            CREATE TABLE IF NOT EXISTS public.email_templates (
                id uuid NOT NULL DEFAULT gen_random_uuid(),
                slug text NOT NULL UNIQUE,
                subject text NOT NULL,
                body text NOT NULL,
                variables jsonb DEFAULT '[]'::jsonb,
                created_at timestamp with time zone DEFAULT now(),
                updated_at timestamp with time zone DEFAULT now(),
                CONSTRAINT email_templates_pkey PRIMARY KEY (id)
            );
            
            CREATE TABLE IF NOT EXISTS public.billing_settings (
                id uuid NOT NULL DEFAULT gen_random_uuid(),
                smtp_host text,
                smtp_port integer DEFAULT 587,
                smtp_user text,
                smtp_pass text,
                from_email text,
                from_name text DEFAULT 'Ublo Chat Billing',
                reminder_3d_subject text DEFAULT 'Seu plano vence em 3 dias',
                reminder_3d_body text DEFAULT 'Olá {{user_name}}, seu plano no Ublo Chat vence em 3 dias.',
                reminder_2d_subject text DEFAULT 'Seu plano vence em 2 dias',
                reminder_2d_body text DEFAULT 'Olá {{user_name}}, restam apenas 2 dias.',
                reminder_0d_subject text DEFAULT 'Seu plano vence HOJE',
                reminder_0d_body text DEFAULT 'Olá {{user_name}}, seu plano vence hoje.',
                expiry_subject text DEFAULT 'Seu plano expirou',
                expiry_body text DEFAULT 'Olá {{user_name}}, seu plano expirou.',
                blockage_subject text DEFAULT 'Funcionalidades Bloqueadas',
                blockage_body text DEFAULT 'Olá {{user_name}}, funcionalidades bloqueadas.',
                created_at timestamp with time zone DEFAULT now(),
                updated_at timestamp with time zone DEFAULT now(),
                CONSTRAINT billing_settings_pkey PRIMARY KEY (id)
            );
            
            CREATE TABLE IF NOT EXISTS public.cron_jobs (
                id uuid NOT NULL DEFAULT gen_random_uuid(),
                name text NOT NULL,
                job_type text NOT NULL,
                cron_job_id integer UNIQUE,
                schedule text,
                enabled boolean DEFAULT true,
                last_run timestamp with time zone,
                created_at timestamp with time zone DEFAULT now(),
                CONSTRAINT cron_jobs_pkey PRIMARY KEY (id)
            );
            
            CREATE TABLE IF NOT EXISTS public.plans (
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
            );
            
            CREATE TABLE IF NOT EXISTS public.system_settings (
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
            );
        `
    },
    // Parte 2 - Profiles (depende de auth.users)
    {
        name: 'Profiles',
        sql: `
            CREATE TABLE IF NOT EXISTS public.profiles (
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
                CONSTRAINT profiles_pkey PRIMARY KEY (id),
                CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
            );
        `
    },
    // Parte 3 - Tabelas que dependem de auth.users
    {
        name: 'Tabelas de Usuário',
        sql: `
            CREATE TABLE IF NOT EXISTS public.ai_settings (
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
                provider text DEFAULT 'gemini' CHECK (provider IN ('gemini', 'chatgpt')),
                CONSTRAINT ai_settings_pkey PRIMARY KEY (id),
                CONSTRAINT ai_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
            );
            
            CREATE TABLE IF NOT EXISTS public.api_keys (
                id uuid NOT NULL DEFAULT gen_random_uuid(),
                user_id uuid NOT NULL,
                name text NOT NULL,
                key text NOT NULL UNIQUE,
                created_at timestamp with time zone DEFAULT now(),
                last_used_at timestamp with time zone,
                CONSTRAINT api_keys_pkey PRIMARY KEY (id),
                CONSTRAINT api_keys_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
            );
            
            CREATE TABLE IF NOT EXISTS public.away_messages_sent (
                id uuid NOT NULL DEFAULT gen_random_uuid(),
                user_id uuid,
                remote_jid text NOT NULL,
                sent_at timestamp with time zone DEFAULT now(),
                CONSTRAINT away_messages_sent_pkey PRIMARY KEY (id),
                CONSTRAINT away_messages_sent_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL
            );
            
            CREATE TABLE IF NOT EXISTS public.blocked_resources (
                id uuid NOT NULL DEFAULT gen_random_uuid(),
                user_id uuid NOT NULL,
                resource_type text NOT NULL CHECK (resource_type IN ('chatbot', 'flow')),
                resource_id uuid NOT NULL,
                created_at timestamp with time zone DEFAULT now(),
                CONSTRAINT blocked_resources_pkey PRIMARY KEY (id),
                CONSTRAINT blocked_resources_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
            );
            
            CREATE TABLE IF NOT EXISTS public.business_hours (
                id uuid NOT NULL DEFAULT gen_random_uuid(),
                user_id uuid UNIQUE,
                enabled boolean DEFAULT false,
                away_message text NOT NULL DEFAULT 'Olá! Estamos fora do horário de atendimento.',
                monday_enabled boolean DEFAULT true,
                monday_start time DEFAULT '08:00',
                monday_end time DEFAULT '18:00',
                tuesday_enabled boolean DEFAULT true,
                tuesday_start time DEFAULT '08:00',
                tuesday_end time DEFAULT '18:00',
                wednesday_enabled boolean DEFAULT true,
                wednesday_start time DEFAULT '08:00',
                wednesday_end time DEFAULT '18:00',
                thursday_enabled boolean DEFAULT true,
                thursday_start time DEFAULT '08:00',
                thursday_end time DEFAULT '18:00',
                friday_enabled boolean DEFAULT true,
                friday_start time DEFAULT '08:00',
                friday_end time DEFAULT '18:00',
                saturday_enabled boolean DEFAULT false,
                saturday_start time DEFAULT '09:00',
                saturday_end time DEFAULT '13:00',
                sunday_enabled boolean DEFAULT false,
                sunday_start time DEFAULT '09:00',
                sunday_end time DEFAULT '13:00',
                timezone text DEFAULT 'America/Sao_Paulo',
                created_at timestamp with time zone DEFAULT now(),
                updated_at timestamp with time zone DEFAULT now(),
                CONSTRAINT business_hours_pkey PRIMARY KEY (id),
                CONSTRAINT business_hours_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
            );
            
            CREATE TABLE IF NOT EXISTS public.contact_lists (
                id uuid NOT NULL DEFAULT gen_random_uuid(),
                user_id uuid NOT NULL,
                name text NOT NULL,
                created_at timestamp with time zone DEFAULT now(),
                CONSTRAINT contact_lists_pkey PRIMARY KEY (id),
                CONSTRAINT contact_lists_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
            );
            
            CREATE TABLE IF NOT EXISTS public.contacts (
                id uuid NOT NULL DEFAULT gen_random_uuid(),
                user_id uuid,
                name text NOT NULL,
                remote_jid text NOT NULL UNIQUE,
                avatar_url text,
                email text,
                notes text,
                created_at timestamp with time zone DEFAULT now(),
                tags text[] DEFAULT '{}',
                CONSTRAINT contacts_pkey PRIMARY KEY (id),
                CONSTRAINT contacts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL
            );
            
            CREATE TABLE IF NOT EXISTS public.integrations (
                id uuid NOT NULL DEFAULT gen_random_uuid(),
                user_id uuid NOT NULL,
                type text NOT NULL,
                credentials jsonb NOT NULL DEFAULT '{}',
                is_active boolean DEFAULT true,
                created_at timestamp with time zone DEFAULT now(),
                updated_at timestamp with time zone DEFAULT now(),
                CONSTRAINT integrations_pkey PRIMARY KEY (id),
                CONSTRAINT integrations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
            );
            
            CREATE TABLE IF NOT EXISTS public.instances (
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
                channel_type text DEFAULT 'evolution' CHECK (channel_type IN ('evolution', 'official')),
                CONSTRAINT instances_pkey PRIMARY KEY (id),
                CONSTRAINT instances_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL
            );
            
            CREATE TABLE IF NOT EXISTS public.subscriptions (
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
                CONSTRAINT subscriptions_pkey PRIMARY KEY (id),
                CONSTRAINT subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
                CONSTRAINT subscriptions_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.plans(id) ON DELETE RESTRICT
            );
        `
    },
    // Parte 4 - Tabelas que dependem de profiles e subscriptions
    {
        name: 'Payment Logs e Billing Notifications',
        sql: `
            CREATE TABLE IF NOT EXISTS public.payment_logs (
                id uuid NOT NULL DEFAULT gen_random_uuid(),
                user_id uuid,
                amount numeric NOT NULL,
                currency text DEFAULT 'BRL',
                method text,
                status text,
                external_id text,
                created_at timestamp with time zone DEFAULT now(),
                CONSTRAINT payment_logs_pkey PRIMARY KEY (id),
                CONSTRAINT payment_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL
            );
            
            CREATE TABLE IF NOT EXISTS public.billing_notifications_log (
                id uuid NOT NULL DEFAULT gen_random_uuid(),
                subscription_id uuid,
                notification_type text NOT NULL,
                sent_at timestamp with time zone DEFAULT now(),
                CONSTRAINT billing_notifications_log_pkey PRIMARY KEY (id),
                CONSTRAINT billing_notifications_log_subscription_id_fkey FOREIGN KEY (subscription_id) REFERENCES public.subscriptions(id) ON DELETE SET NULL
            );
        `
    },
    // Parte 5 - Flows, Chatbots, Campaigns
    {
        name: 'Flows, Chatbots e Campaigns',
        sql: `
            CREATE TABLE IF NOT EXISTS public.flows (
                id uuid NOT NULL DEFAULT gen_random_uuid(),
                user_id uuid NOT NULL,
                name text NOT NULL,
                description text,
                nodes jsonb NOT NULL DEFAULT '[]',
                edges jsonb NOT NULL DEFAULT '[]',
                status text DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'ACTIVE', 'PAUSED')),
                created_at timestamp with time zone DEFAULT now(),
                updated_at timestamp with time zone DEFAULT now(),
                instance_id uuid,
                trigger_type text DEFAULT 'any',
                trigger_keyword text,
                CONSTRAINT flows_pkey PRIMARY KEY (id),
                CONSTRAINT flows_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
                CONSTRAINT flows_instance_id_fkey FOREIGN KEY (instance_id) REFERENCES public.instances(id) ON DELETE SET NULL
            );
            
            CREATE TABLE IF NOT EXISTS public.chatbots (
                id uuid NOT NULL DEFAULT gen_random_uuid(),
                name text NOT NULL,
                trigger text,
                instance_id uuid,
                status text DEFAULT 'ACTIVE',
                last_run timestamp with time zone,
                type text DEFAULT 'SIMPLE',
                user_id uuid,
                created_at timestamp with time zone DEFAULT now(),
                match_type text DEFAULT 'contains' CHECK (match_type IN ('exact', 'contains', 'starts', 'ends')),
                description text,
                updated_at timestamp with time zone DEFAULT now(),
                CONSTRAINT chatbots_pkey PRIMARY KEY (id),
                CONSTRAINT chatbots_instance_id_fkey FOREIGN KEY (instance_id) REFERENCES public.instances(id) ON DELETE SET NULL,
                CONSTRAINT chatbots_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
            );
            
            CREATE TABLE IF NOT EXISTS public.campaigns (
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
                CONSTRAINT campaigns_pkey PRIMARY KEY (id),
                CONSTRAINT campaigns_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
                CONSTRAINT campaigns_instance_id_fkey FOREIGN KEY (instance_id) REFERENCES public.instances(id) ON DELETE CASCADE
            );
            
            CREATE TABLE IF NOT EXISTS public.whatsapp_official_resources (
                id uuid NOT NULL DEFAULT gen_random_uuid(),
                instance_id uuid NOT NULL UNIQUE,
                phone_number_id text NOT NULL,
                business_account_id text NOT NULL,
                access_token text NOT NULL,
                verify_token text NOT NULL,
                created_at timestamp with time zone DEFAULT now(),
                CONSTRAINT whatsapp_official_resources_pkey PRIMARY KEY (id),
                CONSTRAINT whatsapp_official_resources_instance_id_fkey FOREIGN KEY (instance_id) REFERENCES public.instances(id) ON DELETE CASCADE
            );
        `
    },
    // Parte 6 - Chatbot Steps, Campaign Messages
    {
        name: 'Chatbot Steps e Campaign Messages',
        sql: `
            CREATE TABLE IF NOT EXISTS public.chatbot_steps (
                id uuid NOT NULL DEFAULT gen_random_uuid(),
                chatbot_id uuid,
                type text NOT NULL,
                content text NOT NULL,
                delay integer DEFAULT 2,
                simulate_typing boolean DEFAULT true,
                "order" integer NOT NULL,
                created_at timestamp with time zone DEFAULT now(),
                next_step_id uuid,
                CONSTRAINT chatbot_steps_pkey PRIMARY KEY (id),
                CONSTRAINT chatbot_steps_chatbot_id_fkey FOREIGN KEY (chatbot_id) REFERENCES public.chatbots(id) ON DELETE CASCADE,
                CONSTRAINT chatbot_steps_next_step_id_fkey FOREIGN KEY (next_step_id) REFERENCES public.chatbot_steps(id) ON DELETE SET NULL
            );
            
            CREATE TABLE IF NOT EXISTS public.campaign_messages (
                id uuid NOT NULL DEFAULT gen_random_uuid(),
                campaign_id uuid NOT NULL,
                remote_jid text NOT NULL,
                variables jsonb DEFAULT '{}',
                status text NOT NULL DEFAULT 'PENDING',
                sent_at timestamp with time zone,
                error_message text,
                created_at timestamp with time zone DEFAULT now(),
                CONSTRAINT campaign_messages_pkey PRIMARY KEY (id),
                CONSTRAINT campaign_messages_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE
            );
            
            CREATE TABLE IF NOT EXISTS public.contact_list_members (
                list_id uuid NOT NULL,
                contact_id uuid NOT NULL,
                created_at timestamp with time zone DEFAULT now(),
                CONSTRAINT contact_list_members_pkey PRIMARY KEY (list_id, contact_id),
                CONSTRAINT contact_list_members_list_id_fkey FOREIGN KEY (list_id) REFERENCES public.contact_lists(id) ON DELETE CASCADE,
                CONSTRAINT contact_list_members_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE CASCADE
            );
        `
    },
    // Parte 7 - Conversations e Messages
    {
        name: 'Conversations e Messages',
        sql: `
            CREATE TABLE IF NOT EXISTS public.conversations (
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
                CONSTRAINT conversations_pkey PRIMARY KEY (id),
                CONSTRAINT conversations_instance_id_fkey FOREIGN KEY (instance_id) REFERENCES public.instances(id) ON DELETE SET NULL,
                CONSTRAINT conversations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL,
                CONSTRAINT conversations_current_flow_id_fkey FOREIGN KEY (current_flow_id) REFERENCES public.flows(id) ON DELETE SET NULL,
                CONSTRAINT conversations_assigned_agent_id_fkey FOREIGN KEY (assigned_agent_id) REFERENCES public.profiles(id) ON DELETE SET NULL
            );
            
            CREATE TABLE IF NOT EXISTS public.messages (
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
                CONSTRAINT messages_pkey PRIMARY KEY (id),
                CONSTRAINT messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE,
                CONSTRAINT messages_quoted_id_fkey FOREIGN KEY (quoted_id) REFERENCES public.messages(id) ON DELETE SET NULL
            );
        `
    },
    // Parte 8 - Índices
    {
        name: 'Índices',
        sql: `
            CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
            CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON public.messages(timestamp);
            CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON public.conversations(user_id);
            CREATE INDEX IF NOT EXISTS idx_conversations_instance_id ON public.conversations(instance_id);
            CREATE INDEX IF NOT EXISTS idx_conversations_remote_jid ON public.conversations(remote_jid);
            CREATE INDEX IF NOT EXISTS idx_campaigns_status ON public.campaigns(status);
            CREATE INDEX IF NOT EXISTS idx_campaigns_scheduled_at ON public.campaigns(scheduled_at);
            CREATE INDEX IF NOT EXISTS idx_campaign_messages_status ON public.campaign_messages(status);
            CREATE INDEX IF NOT EXISTS idx_contacts_remote_jid ON public.contacts(remote_jid);
            CREATE INDEX IF NOT EXISTS idx_instances_identifier ON public.instances(identifier);
            CREATE INDEX IF NOT EXISTS idx_chatbots_instance_id ON public.chatbots(instance_id);
            CREATE INDEX IF NOT EXISTS idx_flows_instance_id ON public.flows(instance_id);
        `
    },
    // Parte 9 - RLS habilitado
    {
        name: 'Row Level Security',
        sql: `
            ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
            ALTER TABLE public.instances ENABLE ROW LEVEL SECURITY;
            ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
            ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
            ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
            ALTER TABLE public.chatbots ENABLE ROW LEVEL SECURITY;
            ALTER TABLE public.flows ENABLE ROW LEVEL SECURITY;
            ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
            ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
            ALTER TABLE public.ai_settings ENABLE ROW LEVEL SECURITY;
            ALTER TABLE public.business_hours ENABLE ROW LEVEL SECURITY;
            ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
            ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
        `
    },
    // Parte 10 - Políticas RLS
    {
        name: 'Políticas RLS',
        sql: `
            DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
            CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
            DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
            CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
            
            DROP POLICY IF EXISTS "Users can manage own instances" ON public.instances;
            CREATE POLICY "Users can manage own instances" ON public.instances FOR ALL USING (auth.uid() = user_id);
            
            DROP POLICY IF EXISTS "Users can manage own conversations" ON public.conversations;
            CREATE POLICY "Users can manage own conversations" ON public.conversations FOR ALL USING (auth.uid() = user_id);
            
            DROP POLICY IF EXISTS "Users can manage messages" ON public.messages;
            CREATE POLICY "Users can manage messages" ON public.messages FOR ALL 
            USING (EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND c.user_id = auth.uid()));
            
            DROP POLICY IF EXISTS "Users can manage own contacts" ON public.contacts;
            CREATE POLICY "Users can manage own contacts" ON public.contacts FOR ALL USING (auth.uid() = user_id);
            
            DROP POLICY IF EXISTS "Users can manage own chatbots" ON public.chatbots;
            CREATE POLICY "Users can manage own chatbots" ON public.chatbots FOR ALL USING (auth.uid() = user_id);
            
            DROP POLICY IF EXISTS "Users can manage own flows" ON public.flows;
            CREATE POLICY "Users can manage own flows" ON public.flows FOR ALL USING (auth.uid() = user_id);
            
            DROP POLICY IF EXISTS "Users can manage own campaigns" ON public.campaigns;
            CREATE POLICY "Users can manage own campaigns" ON public.campaigns FOR ALL USING (auth.uid() = user_id);
            
            DROP POLICY IF EXISTS "Users can view own subscription" ON public.subscriptions;
            CREATE POLICY "Users can view own subscription" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);
            
            DROP POLICY IF EXISTS "Users can manage own ai_settings" ON public.ai_settings;
            CREATE POLICY "Users can manage own ai_settings" ON public.ai_settings FOR ALL USING (auth.uid() = user_id);
            
            DROP POLICY IF EXISTS "Users can manage own business_hours" ON public.business_hours;
            CREATE POLICY "Users can manage own business_hours" ON public.business_hours FOR ALL USING (auth.uid() = user_id);
            
            DROP POLICY IF EXISTS "Users can manage own integrations" ON public.integrations;
            CREATE POLICY "Users can manage own integrations" ON public.integrations FOR ALL USING (auth.uid() = user_id);
            
            DROP POLICY IF EXISTS "Users can manage own api_keys" ON public.api_keys;
            CREATE POLICY "Users can manage own api_keys" ON public.api_keys FOR ALL USING (auth.uid() = user_id);
        `
    },
    // Parte 11 - Trigger e dados iniciais
    {
        name: 'Trigger e Dados Iniciais',
        sql: `
            CREATE OR REPLACE FUNCTION public.handle_new_user()
            RETURNS TRIGGER AS $$
            BEGIN
                INSERT INTO public.profiles (id, email, full_name)
                VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql SECURITY DEFINER;

            DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
            CREATE TRIGGER on_auth_user_created
                AFTER INSERT ON auth.users
                FOR EACH ROW
                EXECUTE FUNCTION public.handle_new_user();

            INSERT INTO public.plans (name, description, price, max_instances, max_contacts, max_chatbots, max_users, ai_enabled)
            SELECT 'Plano Básico', 'Plano inicial com recursos básicos', 0, 1, 100, 1, 1, false
            WHERE NOT EXISTS (SELECT 1 FROM public.plans WHERE name = 'Plano Básico');

            INSERT INTO public.plans (name, description, price, max_instances, max_contacts, max_chatbots, max_users, ai_enabled)
            SELECT 'Plano Pro', 'Plano profissional com mais recursos', 99.90, 5, 1000, 10, 5, true
            WHERE NOT EXISTS (SELECT 1 FROM public.plans WHERE name = 'Plano Pro');

            INSERT INTO public.system_settings (api_url, api_key)
            SELECT 'https://api.ublochat.com.br', ''
            WHERE NOT EXISTS (SELECT 1 FROM public.system_settings);

            INSERT INTO public.billing_settings (from_name)
            SELECT 'Ublo Chat Billing'
            WHERE NOT EXISTS (SELECT 1 FROM public.billing_settings);
        `
    }
];

async function runMigrations() {
    const client = await pool.connect();

    try {
        // Testar conexão
        const result = await client.query('SELECT current_user, current_database()');
        console.log(`✅ Conectado como: ${result.rows[0].current_user}`);
        console.log(`📁 Banco: ${result.rows[0].current_database}`);
        console.log('');

        // Executar cada migração
        for (let i = 0; i < migrations.length; i++) {
            const migration = migrations[i];
            console.log(`⏳ [${i + 1}/${migrations.length}] ${migration.name}...`);

            try {
                await client.query(migration.sql);
                console.log(`   ✅ Sucesso!`);
            } catch (err) {
                if (err.message.includes('already exists')) {
                    console.log(`   ⚠️ Já existe (OK)`);
                } else {
                    console.log(`   ❌ Erro: ${err.message}`);
                    // Continua com as próximas migrações
                }
            }
        }

        // Verificar tabelas criadas
        console.log('\n📋 Verificando tabelas criadas...');
        const tablesResult = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        `);

        console.log(`   Total: ${tablesResult.rows.length} tabelas`);
        tablesResult.rows.forEach((row, index) => {
            console.log(`   ${index + 1}. ${row.table_name}`);
        });

        // Force Schema Cache Reload for PostgREST
        console.log('\n🔄 Reloading Schema Cache...');
        await client.query("NOTIFY pgrst, 'reload config'");

        console.log('\n🎉 Migração concluída!');

    } catch (error) {
        console.error('❌ Erro fatal:', error.message);
    } finally {
        client.release();
        await pool.end();
    }
}

runMigrations();
