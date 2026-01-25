
import axios from 'axios';

const API_URL = 'https://evo.takesender.com.br';
const API_KEY = '2aa733c8e9c9caba7e61a2a4cf4be945';

async function debug() {
    try {
        const response = await axios.get(`${API_URL}/instance/fetchInstances`, {
            headers: { 'apikey': API_KEY }
        });

        if (response.data.length > 0) {
            const inst = response.data.find(i => i.connectionStatus === 'open' || i.status === 'open') || response.data[0];
            console.log('Keys for instance:', Object.keys(inst));
            for (let key of Object.keys(inst)) {
                console.log(`Field: ${key}, Type: ${typeof inst[key]}, Value: ${inst[key]}`);
            }
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}

debug();
