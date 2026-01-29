// Check instance connection state in Evolution API
const EVOLUTION_API_URL = 'https://api.ublochat.com.br';
const EVOLUTION_API_KEY = '6923599069fc6ab48f10c2277e730f7c';

async function checkConnection() {
    try {
        const res = await fetch(`${EVOLUTION_API_URL}/instance/connectionState/teste%2001`, {
            headers: { 'apikey': EVOLUTION_API_KEY }
        });
        const state = await res.json();
        console.log('--- ESTADO DA CONEXÃO ---');
        console.log(JSON.stringify(state, null, 2));
    } catch (e) {
        console.error('❌ Erro:', e.message);
    }
}

checkConnection();
