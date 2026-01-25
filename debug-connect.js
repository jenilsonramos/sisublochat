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

async function debugConnect() {
    try {
        // 1. Fetch list to get an instance name
        console.log('Fetching instances...');
        const list = await api.get('/instance/fetchInstances');

        if (list.data.length === 0) {
            console.log('No instances to test connect.');
            return;
        }

        const instance = list.data[0];
        const name = instance.name || instance.instanceName;
        console.log(`Testing connect for: ${name}`);

        // 2. Call Connect
        const response = await api.get(`/instance/connect/${name}`);
        console.log('Connect Response Status:', response.status);
        console.log('Connect Response Body Keys:', Object.keys(response.data));

        if (response.data.base64) {
            console.log('Has Base64: YES');
            console.log('Base64 length:', response.data.base64.length);
        } else {
            console.log('Has Base64: NO');
            console.log('Full Response:', JSON.stringify(response.data, null, 2));
        }

    } catch (e) {
        console.log('Error:', e.message);
        if (e.response) {
            console.log('Error Data:', JSON.stringify(e.response.data, null, 2));
        }
    }
}

debugConnect();
