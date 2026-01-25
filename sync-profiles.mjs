
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://supa.takesender.com.br';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ewogICJyb2xlIjogInNlcnZpY2Vfcm9sZSIsCiAgImlzcyI6ICJzdXBhYmFzZSIsCiAgImlhdCI6IDE3MTUwNTA4MDAsCiAgImV4cCI6IDE4NzI4MTcyMDAKfQ.zj77xlr5ReE1K8DsRwvBOEyGCl_LmiZJGovetZL4kKQ';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function syncProfile() {
    try {
        console.log('Fetching users from auth...');
        const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();

        if (authError) throw authError;

        for (const user of users) {
            console.log(`Checking profile for: ${user.email} (${user.id})`);

            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('id')
                .eq('id', user.id)
                .single();

            if (profileError && profileError.code === 'PGRST116') {
                console.log(`Creating missing profile for ${user.email}...`);
                const { error: insertError } = await supabase.from('profiles').insert({
                    id: user.id,
                    email: user.email,
                    full_name: user.user_metadata?.full_name || 'Usuário',
                    role: 'ADMIN'
                });
                if (insertError) console.error('Insert error:', insertError.message);
                else console.log('✅ Profile created!');
            } else {
                console.log('Profile already exists.');
            }
        }
    } catch (err) {
        console.error('Error:', err.message);
    }
}

syncProfile();
