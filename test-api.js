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

async function testFetch() {
    console.log('Fetching instances...');
    try {
        const list = await api.get('/instance/fetchInstances');
        console.log('Count:', list.data.length);
        if (list.data.length > 0) {
            console.log(JSON.stringify(list.data[0], null, 2));
        }
    } catch (e) {
        console.log('List failed:', e.message);
    }
}

testFetch();
