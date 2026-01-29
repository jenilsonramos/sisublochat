// Script to check webhook configuration in Evolution API
const EVOLUTION_API_URL = 'https://api.ublochat.com.br';
const EVOLUTION_API_KEY = '6923599069fc6ab48f10c2277e730f7c';

async function checkWebhooks() {
    try {
        console.log('🔌 Conectando à Evolution API...');

        const instancesRes = await fetch(`${EVOLUTION_API_URL}/instance/fetchInstances`, {
            headers: { 'apikey': EVOLUTION_API_KEY }
        });

        if (!instancesRes.ok) throw new Error(`Fetch failed: ${instancesRes.status}`);

        const instances = await instancesRes.json();

        for (const inst of instances) {
            const instanceName = inst.instance?.instanceName || inst.name;
            if (!instanceName) continue;

            const verifyRes = await fetch(`${EVOLUTION_API_URL}/webhook/find/${encodeURIComponent(instanceName)}`, {
                headers: { 'apikey': EVOLUTION_API_KEY }
            });
            const verify = await verifyRes.json();
            console.log(`🔍 [${instanceName}] Webhook URL: ${verify?.webhook?.url || verify?.url || 'NÃO ENCONTRADA'}`);
        }
    } catch (error) {
        console.error('❌ Erro:', error.message);
    }
}

checkWebhooks();
