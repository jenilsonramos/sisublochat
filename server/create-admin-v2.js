import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://banco.ublochat.com.br';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3MzgwNDYwMDB9.A9sFJ7XwP3KZtQmMZL0kFJX2PZJ3m8Qn1R8w6bN5A';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function createAdmin() {
    const email = 'jenilson@outlook.com.br';
    const password = '125714Ab#';

    console.log(`👤 Tentando criar admin: ${email}...`);

    try {
        const { data, error } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            app_metadata: { role: 'ADMIN' },
            user_metadata: { full_name: 'Jenilson Ramos', role: 'ADMIN' }
        });

        if (error) {
            if (error.message.includes('already exists')) {
                console.log('✅ Usuário já existe.');
            } else {
                throw error;
            }
        } else {
            console.log('✅ Usuário criado com sucesso:', data.user.id);
        }
    } catch (err) {
        console.error('❌ Erro ao criar usuário:', err.message);
    }
}

createAdmin();
