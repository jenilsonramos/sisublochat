
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rormftnssmqwcluvlszg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvcm1mdG5zc21xd2NsdXZsc3pnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5NDMwNzYsImV4cCI6MjA4NDUxOTA3Nn0.Jb8d8JwEdCyubUVbMTNXi5y9VKYmVaOeQi85RwplB-E';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    console.log('Checking for Chat tables...');

    const tables = ['instances', 'messages', 'contacts', 'chats', 'conversations'];

    for (const table of tables) {
        // Try to select one row
        const { data, error } = await supabase.from(table).select('*').limit(1);

        if (error) {
            console.log(`[${table}] Error:`, error.message); // Likely 404 (Not Found) or 403 (RLS)
        } else {
            console.log(`[${table}] FOUND. Keys:`, data.length > 0 ? Object.keys(data[0]).join(', ') : '(Empty Table)');
        }
    }
}

checkSchema();
