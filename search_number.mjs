
import axios from 'axios';

const API_URL = 'https://evo.takesender.com.br';
const API_KEY = '2aa733c8e9c9caba7e61a2a4cf4be945';

async function debug() {
    try {
        const response = await axios.get(`${API_URL}/instance/fetchInstances`, {
            headers: { 'apikey': API_KEY }
        });

        for (const inst of response.data) {
            console.log(`\n--- Instance: ${inst.instanceName || inst.name} ---`);
            const findValue = (obj, target) => {
                for (let key in obj) {
                    const value = obj[key];
                    if (typeof value === 'string' && value.includes(target)) {
                        console.log(`Found "${target}" in key: ${key}, value: ${value}`);
                    } else if (typeof value === 'object' && value !== null) {
                        findValue(value, target);
                    }
                }
            };
            findValue(inst, '@s.whatsapp.net');
            // Also try to find a number starting with 55 (Brazil)
            findValue(inst, '55');
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}

debug();
