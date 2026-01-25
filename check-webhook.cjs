
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

if (!API_URL || !API_KEY) {
    console.error('Missing Env Vars');
    process.exit(1);
}

async function checkWebhook() {
    try {
        console.log('1. Fetching Connected Instance...');
        const resStats = await fetch(`${API_URL}/instance/fetchInstances`, {
            headers: { 'apikey': API_KEY }
        });
        const instances = await resStats.json();
        const connected = instances.find(i => i.connectionStatus === 'open' || i.status === 'open');

        if (!connected) {
            console.log('No connected instances found.');
            return;
        }

        const instanceName = connected.instanceName || connected.name;
        console.log(`2. Checking Webhook for: ${instanceName}`);

        const res = await fetch(`${API_URL}/webhook/find/${encodeURIComponent(instanceName)}`, {
            headers: { 'apikey': API_KEY }
        });

        const data = await res.json();
        console.log('Current Webhook Config:', JSON.stringify(data, null, 2));

    } catch (error) {
        console.error('Error:', error);
    }
}

checkWebhook();
