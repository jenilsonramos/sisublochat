
const axios = require('axios');

async function simulate() {
    console.log('--- WEBHOOK SIMULATION ---');

    // Payload simulating a text message
    const payload = {
        type: "MESSAGES_UPSERT",
        instance: "LevePedidos", // I need to guess a valid instance name. "LevePedidos" is a good guess based on user name, or "Instancia 1".
        data: {
            key: {
                remoteJid: "5511999999999@s.whatsapp.net",
                fromMe: false,
                id: "SIMULATED_" + Date.now()
            },
            pushName: "Simulado Teste",
            message: {
                conversation: "Teste de Webhook Simulado " + new Date().toLocaleTimeString()
            },
            messageTimestamp: Math.floor(Date.now() / 1000)
        }
    };

    try {
        // Try to hit the local running server
        console.log('Sending invoke to http://localhost:3001/webhook/evolution ...');
        const res = await axios.post('http://localhost:3001/webhook/evolution', payload);
        console.log('✅ Response:', res.status, res.data);
    } catch (err) {
        console.error('❌ Error:', err.message);
        if (err.response) {
            console.error('   Status:', err.response.status);
            console.error('   Data:', err.response.data);
        }
    }
}

simulate();
