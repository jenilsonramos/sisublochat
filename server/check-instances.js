// Check instance status in Evolution API
const EVOLUTION_API_URL = 'https://api.ublochat.com.br';
const EVOLUTION_API_KEY = '6923599069fc6ab48f10c2277e730f7c';

async function checkInstances() {
    try {
        const res = await fetch(`${EVOLUTION_API_URL}/instance/fetchInstances`, {
            headers: { 'apikey': EVOLUTION_API_KEY }
        });
        const instances = await res.json();

        console.log('--- STATUS DAS INSTÂNCIAS ---');
        for (const inst of instances) {
            const name = inst.instance?.instanceName || inst.name;
            const status = inst.instance?.status || inst.status;
            console.log(`📡 [${name}]: ${status}`);
        }
    } catch (e) {
        console.error('❌ Erro:', e.message);
    }
}

checkInstances();
