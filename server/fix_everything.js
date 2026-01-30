
import pg from 'pg';

const DB_CONFIG = {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
};

// Evolution API Config
const EVO_URL = process.env.EVOLUTION_API_URL || 'https://api.ublochat.com.br';
const EVO_KEY = process.env.EVOLUTION_API_KEY;
// The correct internal webhook URL that Evolution API should send to:
// Since Evolution API is external, it must be the PUBLIC URL of the backend through Caddy/Nginx
// OR if Evolution API is internal (docker network), it could be http://app_backend:3001
// User said Evolution API is EXTERNAL (api.ublochat.com.br).
// So the webhook URL must be the public URL of OUR backend.
// Which is https://ublochat.com.br/webhook/evolution
const TARGET_WEBHOOK_URL = 'https://ublochat.com.br/webhook/evolution';

const pool = new pg.Pool(DB_CONFIG);

async function main() {
    console.log('🔥 STARTING HOTFIX: Realtime + Webhooks 🔥');
    const client = await pool.connect();

    try {
        // --- 1. ENABLE REALTIME ---
        console.log('\n--- 1. Enabling Realtime & RLS ---');

        // Ensure Publication Exists
        const pubCheck = await client.query("SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'");
        if (pubCheck.rows.length === 0) {
            console.log('Creating supabase_realtime publication...');
            await client.query("CREATE PUBLICATION supabase_realtime");
        }

        // Add Tables
        const tables = ['messages', 'conversations', 'instances'];
        for (const t of tables) {
            try {
                await client.query(`ALTER PUBLICATION supabase_realtime ADD TABLE ${t}`);
                console.log(`✅ Table ${t} added to Realtime.`);
            } catch (e) {
                if (e.message.includes('already member')) console.log(`ℹ️  Table ${t} already in Realtime.`);
                else console.error(`❌ Failed to add ${t}:`, e.message);
            }
        }

        // Fix RLS Policies (Idempotent)
        await client.query(`
            DROP POLICY IF EXISTS "Users can manage messages" ON public.messages;
            CREATE POLICY "Users can manage messages" ON public.messages FOR ALL 
            USING (EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND c.user_id = auth.uid()));

            DROP POLICY IF EXISTS "Users can manage own conversations" ON public.conversations;
            CREATE POLICY "Users can manage own conversations" ON public.conversations FOR ALL USING (auth.uid() = user_id);

            DROP POLICY IF EXISTS "Users can manage own instances" ON public.instances;
            CREATE POLICY "Users can manage own instances" ON public.instances FOR ALL USING (auth.uid() = user_id);
        `);
        console.log('✅ RLS Policies Updated.');


        // --- 2. UPDATE WEBHOOKS FOR ALL INSTANCES ---
        console.log('\n--- 2. Updating Webhooks (Evolution API) ---');

        const instances = await client.query('SELECT name, identifier FROM instances');
        console.log(`Found ${instances.rows.length} instances.`);

        for (const inst of instances.rows) {
            const instanceName = inst.name;
            console.log(`Configuring webhook for: ${instanceName}...`);

            const url = `${EVO_URL}/webhook/set/${encodeURIComponent(instanceName)}`;

            try {
                const payload = {
                    webhook: {
                        enabled: true,
                        url: TARGET_WEBHOOK_URL,
                        events: [
                            'MESSAGES_UPSERT',
                            'MESSAGES_UPDATE',
                            'MESSAGES_DELETE',
                            'MESSAGES_SET',
                            'SEND_MESSAGE',
                            'CONNECTION_UPDATE',
                            'INSTANCE_DELETE'
                        ],
                        webhookByEvents: true
                    }
                };

                const res = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': EVO_KEY
                    },
                    body: JSON.stringify(payload)
                });

                if (res.ok) {
                    console.log(`✅ Webhook set successfully for ${instanceName}`);
                } else {
                    const txt = await res.text();
                    console.error(`❌ Failed to set webhook for ${instanceName}: ${res.status} - ${txt}`);
                }

            } catch (err) {
                console.error(`❌ Connection error for ${instanceName}:`, err.message);
            }
        }

    } catch (err) {
        console.error('FATAL ERROR:', err);
    } finally {
        client.release();
        pool.end();
        console.log('🔥 HOTFIX COMPLETE 🔥');
    }
}

main();
