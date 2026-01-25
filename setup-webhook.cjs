
const fs = require('fs');
const path = require('path');

// Read .env.local manually
const envPath = path.resolve(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
        env[key.trim()] = value.trim();
    }
});

const API_URL = env['VITE_EVOLUTION_API_URL'];
const API_KEY = env['VITE_EVOLUTION_API_KEY'];
// Hardcoded Function URL
const WEBHOOK_URL = 'https://rormftnssmqwcluvlszg.supabase.co/functions/v1/evolution-webhook';

if (!API_URL || !API_KEY) {
    console.error('Missing Env Vars');
    process.exit(1);
}

async function setupWebhook() {
    try {
        console.log('1. Fetching Connected Instance...');
        const resStats = await fetch(`${API_URL}/instance/fetchInstances`, {
            headers: { 'apikey': API_KEY }
        });
        const instances = await resStats.json();

        const connected = instances.find(i => i.connectionStatus === 'open' || i.status === 'open');

        if (!connected) {
            console.log('No connected instances found. Cannot set webhook.');
            return;
        }

        console.log(`2. Setting Webhook for: ${connected.instanceName || connected.name}`);
        const instanceName = connected.instanceName || connected.name;

        // Use the encoded name just in case
        const encodedName = encodeURIComponent(instanceName);

        const payload = {
            webhook: {
                enabled: true,
                url: WEBHOOK_URL,
                events: [
                    "MESSAGES_UPSERT",
                    "MESSAGES_UPDATE",
                    "SEND_MESSAGE"
                ]
            }
        };

        const res = await fetch(`${API_URL}/webhook/set/${encodedName}`, {
            method: 'POST',
            headers: {
                'apikey': API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        console.log('Webhook Setup Response:', data);

    } catch (error) {
        console.error('Error:', error);
    }
}

setupWebhook();
