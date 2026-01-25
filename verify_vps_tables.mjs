
import axios from 'axios';

const SUPABASE_URL = 'https://supa.takesender.com.br';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ewogICJyb2xlIjogInNlcnZpY2Vfcm9sZSIsCiAgImlzcyI6ICJzdXBhYmFzZSIsCiAgImlhdCI6IDE3MTUwNTA4MDAsCiAgImV4cCI6IDE4NzI4MTcyMDAKfQ.zj77xlr5ReE1K8DsRwvBOEyGCl_LmiZJGovetZL4kKQ';

async function listTables() {
    try {
        console.log('--- Checking tables on VPS Supabase ---');
        const tables = ['instances', 'chatbots', 'chatbot_steps', 'conversations', 'messages', 'contacts', 'debug_logs'];

        for (const table of tables) {
            try {
                const res = await axios.get(`${SUPABASE_URL}/rest/v1/${table}?select=count`, {
                    headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` }
                });
                console.log(`✅ Table "${table}" exists. Row count:`, res.data[0].count);
            } catch (e) {
                console.log(`❌ Table "${table}" error:`, e.message);
            }
        }
    } catch (error) {
        console.error('Global Error:', error.message);
    }
}

listTables();
