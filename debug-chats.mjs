
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const API_URL = process.env.VITE_EVOLUTION_API_URL;
const API_KEY = process.env.VITE_EVOLUTION_API_KEY;

if (!API_URL || !API_KEY) {
    console.error('Missing Env Vars');
    process.exit(1);
}

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'apikey': API_KEY,
        'Content-Type': 'application/json'
    }
});

async function debugChats() {
    try {
        console.log('1. Fetching Instances...');
        const { data: instances } = await api.get('/instance/fetchInstances');

        // Find connected
        const connected = instances.find(i => i.connectionStatus === 'open' || i.status === 'open');

        if (!connected) {
            console.log('No connected instances found.');
            console.log('Instances:', instances.map(i => `${i.name} (${i.connectionStatus})`));
            return;
        }

        console.log(`2. Using Instance: ${connected.name}`);

        console.log('3. Fetching Chats...');
        const { data: chats } = await api.get(`/chat/findChats/${connected.name}`);

        if (!Array.isArray(chats)) {
            console.log('Check response format:', chats);
            return;
        }

        console.log(`Found ${chats.length} chats.`);

        // Sort by time descending (if available) to see newest
        // Note: Evolution might return them unsorted or sorted.
        // Let's inspect the first 3.

        chats.slice(0, 3).forEach((c, idx) => {
            console.log(`\n--- Chat #${idx + 1} ---`);
            console.log(`Name: ${c.name || c.documentWith || c.id}`);
            console.log(`JID: ${c.id}`);
            console.log(`Unread: ${c.unreadCount}`);
            console.log(`Timestamp: ${c.messageTimestamp}`);
            const date = c.messageTimestamp ? new Date(c.messageTimestamp * 1000).toLocaleString() : 'N/A';
            console.log(`Date: ${date}`);
            console.log(`Last Msg: ${c.conversation ? c.conversation.substring(0, 50) + '...' : 'N/A'}`);
        });

    } catch (error) {
        console.error('Error:', error.message);
        if (error.response) console.error('Response:', error.response.data);
    }
}

debugChats();
