
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

async function debugChats() {
    try {
        console.log('1. Fetching Instances...', API_URL);
        const resStats = await fetch(`${API_URL}/instance/fetchInstances`, {
            headers: { 'apikey': API_KEY }
        });
        const instances = await resStats.json();

        // Find connected
        const connected = instances.find(i => i.connectionStatus === 'open' || i.status === 'open');

        if (!connected) {
            console.log('No connected instances found.');
            return;
        }

        console.log(`2. Using Instance: ${connected.name}`);

        console.log('3. Fetching Chats...');
        const resChats = await fetch(`${API_URL}/chat/findChats/${connected.name}`, {
            headers: { 'apikey': API_KEY }
        });
        const chats = await resChats.json();

        if (!Array.isArray(chats)) {
            console.log('Check response format:', chats);
            console.log(chats);
            return;
        }

        console.log(`Found ${chats.length} chats.`);

        // Manual Sort
        chats.sort((a, b) => (b.messageTimestamp || 0) - (a.messageTimestamp || 0));

        chats.slice(0, 3).forEach((c, idx) => {
            console.log(`\n--- Chat #${idx + 1} ---`);
            const name = c.pushName || c.name || c.id.split('@')[0];
            console.log(`Name: ${name}`);
            console.log(`JID: ${c.id}`);
            console.log(`Unread: ${c.unreadCount}`);
            console.log(`Timestamp: ${c.messageTimestamp}`);
            const date = c.messageTimestamp ? new Date(c.messageTimestamp * 1000).toLocaleString() : 'N/A';
            console.log(`Date: ${date}`);

            // Last msg content varies
            let msgContent = 'Unknown';
            if (c.conversation) msgContent = c.conversation;
            else if (c.message) {
                if (c.message.conversation) msgContent = c.message.conversation;
                else if (c.message.extendedTextMessage) msgContent = c.message.extendedTextMessage.text;
                else if (c.message.imageMessage) msgContent = '[Image] ' + (c.message.imageMessage.caption || '');
            }
            console.log(`Last Msg: ${msgContent.substring(0, 100)}...`);
        });

    } catch (error) {
        console.error('Error:', error);
    }
}

debugChats();
