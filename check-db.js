
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://rormftnssmqwcluvlszg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvcm1mdG5zc21xd2NsdXZsc3pnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5NDMwNzYsImV4cCI6MjA4NDUxOTA3Nn0.Jb8d8JwEdCyubUVbMTNXi5y9VKYmVaOeQi85RwplB-E';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    console.log('Fetching one instance...');
    const { data, error } = await supabase.from('instances').select('*').limit(1);

    if (error) {
        console.error('Error:', error);
    } else {
        if (data.length > 0) {
            console.log('Keys:', Object.keys(data[0]));
        } else {
            console.log('No instances found.');
        }
    }
}

checkSchema();
