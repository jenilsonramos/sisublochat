
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://supa.takesender.com.br';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ewogICJyb2xlIjogInNlcnZpY2Vfcm9sZSIsCiAgImlzcyI6ICJzdXBhYmFzZSIsCiAgImlhdCI6IDE3MTUwNTA4MDAsCiAgImV4cCI6IDE4NzI4MTcyMDAKfQ.zj77xlr5ReE1K8DsRwvBOEyGCl_LmiZJGovetZL4kKQ';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function criarUsuario() {
    console.log('--- Iniciando Criação de Usuário na VPS ---');
    try {
        const { data, error } = await supabase.auth.admin.createUser({
            email: 'minovo@gmail.com', // Coloquei um e-mail fictício, você pode trocar
            password: 'minovo1257',
            email_confirm: true,
            user_metadata: { full_name: 'minovo' }
        });

        if (error) {
            console.error('Erro ao criar usuário:', error.message);
        } else {
            console.log('✅ Usuário criado com sucesso!');
            console.log('ID do Usuário:', data.user.id);
            console.log('\nAgora você já pode fazer login no sistema com:');
            console.log('Email: minovo@gmail.com');
            console.log('Senha: minovo1257');
        }
    } catch (err) {
        console.error('Erro inesperado:', err.message);
    }
}

criarUsuario();
