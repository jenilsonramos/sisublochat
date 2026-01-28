// Script para configurar as settings do sistema via Supabase SDK
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://banco.ublochat.com.br';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ewogICJyb2xlIjogInNlcnZpY2Vfcm9sZSIsCiAgImlzcyI6ICJzdXBhYmFzZSIsCiAgImlhdCI6IDE3MTUwNTA4MDAsCiAgImV4cCI6IDE4NzI4MTcyMDAKfQ.acKFpAf66rIMgWI_tAJWoCk2vqAQXlIhIfVUKQ7XssI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupSystemSettings() {
    console.log('🔧 Configurando system_settings...');

    // Dados da Evolution API (obtidos do .env.local)
    const settings = {
        api_url: 'https://api.ublochat.com.br',
        api_key: 'f534ab200345bc2b35ef679dde6e61ec',
        webhook_url: 'https://banco.ublochat.com.br/functions/v1/evolution-webhook'
    };

    // Verificar se já existe
    const { data: existing, error: checkError } = await supabase
        .from('system_settings')
        .select('*')
        .limit(1);

    if (checkError) {
        console.log('❌ Erro ao verificar settings:', checkError.message);
        return;
    }

    if (existing && existing.length > 0) {
        // Atualizar
        console.log('📝 Atualizando configurações existentes...');
        const { error: updateError } = await supabase
            .from('system_settings')
            .update(settings)
            .eq('id', existing[0].id);

        if (updateError) {
            console.log('❌ Erro ao atualizar:', updateError.message);
        } else {
            console.log('✅ Configurações atualizadas!');
        }
    } else {
        // Inserir
        console.log('📝 Inserindo novas configurações...');
        const { error: insertError } = await supabase
            .from('system_settings')
            .insert(settings);

        if (insertError) {
            console.log('❌ Erro ao inserir:', insertError.message);
        } else {
            console.log('✅ Configurações inseridas!');
        }
    }

    // Verificar resultado
    const { data: final, error: finalError } = await supabase
        .from('system_settings')
        .select('api_url, api_key, webhook_url')
        .limit(1);

    if (!finalError && final) {
        console.log('\n📋 Configurações atuais:');
        console.log(`   API URL: ${final[0]?.api_url || '(não configurado)'}`);
        console.log(`   API Key: ${final[0]?.api_key ? '****' + final[0].api_key.slice(-4) : '(não configurado)'}`);
        console.log(`   Webhook: ${final[0]?.webhook_url || '(não configurado)'}`);
    }
}

setupSystemSettings();
