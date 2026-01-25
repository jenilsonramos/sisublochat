import axios from 'axios';

const API_URL = 'https://evo.takesender.com.br';
const API_KEY = '2aa733c8e9c9caba7e61a2a4cf4be945';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'apikey': API_KEY,
        'Content-Type': 'application/json'
    }
});

async function debugKeys() {
    try {
        const list = await api.get('/instance/fetchInstances');
        if (list.data.length > 0) {
            const item = list.data[0];
            console.log('KEYS:', JSON.stringify(Object.keys(item)));
        } else {
            console.log('No instances.');
        }
    } catch (e) {
        console.log('Error:', e.message);
    }
}

debugKeys();
