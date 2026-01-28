// Script para testar a conexão com o Supabase self-hosted
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://banco.ublochat.com.br';
const supabaseKey = 'V9r#yF8p2!qZx7@JnK4eT1lM3wQ9sU0b';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
    console.log('🔄 Testando conexão com Supabase self-hosted...');
    console.log(`📡 URL: ${supabaseUrl}`);

    try {
        // Testar conexão básica
        const { data: tables, error: tablesError } = await supabase
            .from('system_settings')
            .select('*')
            .limit(1);

        if (tablesError) {
            console.log('❌ Erro ao conectar:', tablesError.message);
        } else {
            console.log('✅ Conexão bem-sucedida!');
            console.log('📋 System settings:', tables);
        }

        // Listar tabelas
        const { data: allTables, error: allError } = await supabase
            .rpc('get_tables');

        if (!allError && allTables) {
            console.log('\n📋 Tabelas encontradas:', allTables);
        }

        // Verificar planos
        const { data: plans, error: plansError } = await supabase
            .from('plans')
            .select('name, price');

        if (!plansError && plans) {
            console.log('\n💰 Planos:');
            plans.forEach(p => console.log(`   - ${p.name}: R$${p.price}`));
        }

        // Verificar profiles
        const { data: profiles, error: profError } = await supabase
            .from('profiles')
            .select('id, email, role')
            .limit(5);

        if (!profError && profiles) {
            console.log(`\n👥 Profiles (${profiles.length}):`);
            profiles.forEach(p => console.log(`   - ${p.email} (${p.role})`));
        }

        // Verificar instances
        const { data: instances, error: instError } = await supabase
            .from('instances')
            .select('id, name, status')
            .limit(5);

        if (!instError && instances) {
            console.log(`\n📱 Instances (${instances.length}):`);
            instances.forEach(i => console.log(`   - ${i.name}: ${i.status}`));
        }

        console.log('\n✅ Teste de conexão concluído!');

    } catch (err) {
        console.error('❌ Erro:', err.message);
    }
}

testConnection();
