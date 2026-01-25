
import axios from 'axios';

const SUPABASE_URL = 'https://supa.takesender.com.br';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ewogICJyb2xlIjogInNlcnZpY2Vfcm9sZSIsCiAgImlzcyI6ICJzdXBhYmFzZSIsCiAgImlhdCI6IDE3MTUwNTA4MDAsCiAgImV4cCI6IDE4NzI4MTcyMDAKfQ.zj77xlr5ReE1K8DsRwvBOEyGCl_LmiZJGovetZL4kKQ';

async function testConnection() {
    try {
        console.log('Testing connection to VPS Supabase...');
        const response = await axios.get(`${SUPABASE_URL}/rest/v1/instances?select=count`, {
            headers: {
                'apikey': SERVICE_KEY,
                'Authorization': `Bearer ${SERVICE_KEY}`
            }
        });
        console.log('Success! Connection verified. Instance count response:', response.data);

        // Check profiles table (auth integration check)
        const profileRes = await axios.get(`${SUPABASE_URL}/rest/v1/profiles?select=count`, {
            headers: {
                'apikey': SERVICE_KEY,
                'Authorization': `Bearer ${SERVICE_KEY}`
            }
        });
        console.log('Profiles table check:', profileRes.data);

    } catch (error) {
        console.error('Connection failed:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
    }
}

testConnection();
