// Script para verificar os logs de debug
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://banco.ublochat.com.br';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ewogICJyb2xlIjogInNlcnZpY2Vfcm9sZSIsCiAgImlzcyI6ICJzdXBhYmFzZSIsCiAgImlhdCI6IDE3MTUwNTA4MDAsCiAgImV4cCI6IDE4NzI4MTcyMDAKfQ.acKFpAf66rIMgWI_tAJWoCk2vqAQXlIhIfVUKQ7XssI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLogs() {
    console.log('📋 Verificando logs de debug...\n');

    // Buscar os últimos logs
    const { data: logs, error } = await supabase
        .from('debug_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) {
        console.log('❌ Erro ao buscar logs:', error.message);
        return;
    }

    if (!logs || logs.length === 0) {
        console.log('⚠️ Nenhum log encontrado na tabela debug_logs');
        console.log('   Isso indica que a Edge Function pode não estar conseguindo escrever logs');
        return;
    }

    console.log(`📋 Últimos ${logs.length} logs:\n`);
    logs.forEach((log, i) => {
        const date = new Date(log.created_at).toLocaleString('pt-BR');
        const content = log.content?.substring(0, 200) || '(vazio)';
        console.log(`[${i + 1}] ${date}`);
        console.log(`    ${content}${log.content?.length > 200 ? '...' : ''}\n`);
    });
}

checkLogs();
