
import axios from 'axios';

const API_URL = 'https://evo.takesender.com.br';
const API_KEY = '2aa733c8e9c9caba7e61a2a4cf4be945';

async function debug() {
    try {
        const response = await axios.get(`${API_URL}/instance/fetchInstances`, {
            headers: { 'apikey': API_KEY }
        });

        const openInstance = response.data.find(i => i.connectionStatus === 'open' || i.status === 'open');
        if (openInstance) {
            console.log('--- FULL OPEN INSTANCE DATA ---');
            console.log(JSON.stringify(openInstance, null, 2));
        } else {
            console.log('No open instances found.');
            if (response.data.length > 0) {
                console.log('First instance data:', JSON.stringify(response.data[0], null, 2));
            }
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}

debug();
