// Script to configure webhook on Evolution API instances
// Webhook URL pointing to the backend Node.js server

const EVOLUTION_API_URL = 'https://api.ublochat.com.br';
const EVOLUTION_API_KEY = '6923599069fc6ab48f10c2277e730f7c';
// Use the backend webhook URL instead of Supabase Edge Function
const WEBHOOK_URL = 'https://ublochat.com.br/webhook/evolution';

async function configureWebhooks() {
    try {
        console.log('🔌 Conectando à Evolution API...');
        console.log('URL:', EVOLUTION_API_URL);
        console.log('Webhook:', WEBHOOK_URL);

        // 1. Fetch all instances
        const instancesRes = await fetch(`${EVOLUTION_API_URL}/instance/fetchInstances`, {
            headers: { 'apikey': EVOLUTION_API_KEY }
        });

        if (!instancesRes.ok) {
            throw new Error(`Fetch instances failed: ${instancesRes.status}`);
        }

        const instances = await instancesRes.json();
        console.log('📋 Instâncias encontradas:', instances.length);

        // 2. Configure webhook for each instance
        for (const inst of instances) {
            const instanceName = inst.instance?.instanceName || inst.name;
            if (!instanceName) continue;

            console.log(`\n🔧 Configurando webhook para: ${instanceName}`);

            const webhookPayload = {
                webhook: {
                    enabled: true,
                    url: WEBHOOK_URL,
                    events: [
                        'MESSAGES_UPSERT',
                        'MESSAGES_UPDATE',
                        'MESSAGES_DELETE',
                        'MESSAGES_SET',
                        'SEND_MESSAGE',
                        'CONNECTION_UPDATE'
                    ],
                    webhookByEvents: true
                }
            };

            const setRes = await fetch(`${EVOLUTION_API_URL}/webhook/set/${encodeURIComponent(instanceName)}`, {
                method: 'POST',
                headers: {
                    'apikey': EVOLUTION_API_KEY,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(webhookPayload)
            });

            const result = await setRes.json();
            console.log(`✅ ${instanceName}:`, setRes.ok ? 'Webhook configurado!' : result);

            // Verify webhook configuration
            const verifyRes = await fetch(`${EVOLUTION_API_URL}/webhook/find/${encodeURIComponent(instanceName)}`, {
                headers: { 'apikey': EVOLUTION_API_KEY }
            });
            const verify = await verifyRes.json();
            console.log(`   → URL atual: ${verify?.webhook?.url || verify?.url || 'não encontrada'}`);
        }

        console.log('\n🎉 Configuração de webhooks concluída!');

    } catch (error) {
        console.error('❌ Erro:', error.message);
    }
}

configureWebhooks();
