
import axios from 'axios';

const API_URL = 'https://evo.takesender.com.br';
const API_KEY = '2aa733c8e9c9caba7e61a2a4cf4be945';

async function debug() {
    try {
        const response = await axios.get(`${API_URL}/instance/fetchInstances`, {
            headers: { 'apikey': API_KEY }
        });

        if (response.data.length > 0) {
            const inst = response.data[0];
            console.log('Keys:', Object.keys(inst));
            console.log('Value of ownerJid:', inst.ownerJid);
            console.log('Value of name:', inst.name);
            console.log('Value of instanceName:', inst.instanceName);
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}

debug();
