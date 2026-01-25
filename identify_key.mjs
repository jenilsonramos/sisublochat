
import axios from 'axios';

const API_URL = 'https://evo.takesender.com.br';
const API_KEY = '2aa733c8e9c9caba7e61a2a4cf4be945';

async function debug() {
    try {
        const response = await axios.get(`${API_URL}/instance/fetchInstances`, {
            headers: { 'apikey': API_KEY }
        });

        for (const inst of response.data) {
            console.log(`\nInstance: ${inst.instanceName || inst.name}`);
            const keys = Object.keys(inst);
            keys.forEach(k => {
                if (typeof inst[k] === 'string' && inst[k].includes('@s.whatsapp.net')) {
                    console.log(`>> KEY matches JID: "${k}" (Value: ${inst[k]})`);
                }
            });
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}

debug();
