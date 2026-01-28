// Script para testar o webhook da Edge Function
import fetch from 'node-fetch';

const WEBHOOK_URL = 'https://banco.ublochat.com.br/functions/v1/evolution-webhook';

async function testWebhook() {
    console.log('🔄 Testando Edge Function webhook...');
    console.log(`📡 URL: ${WEBHOOK_URL}`);

    const testPayload = {
        type: 'MESSAGES_UPSERT',
        instance: 'test-instance',
        data: {
            messages: [{
                key: {
                    remoteJid: '5511999999999@s.whatsapp.net',
                    fromMe: false,
                    id: 'test-message-id-' + Date.now()
                },
                message: {
                    conversation: 'Mensagem de teste do script'
                },
                pushName: 'Teste Script',
                messageTimestamp: Math.floor(Date.now() / 1000)
            }]
        }
    };

    try {
        console.log('📤 Enviando payload de teste...');

        const response = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(testPayload)
        });

        const statusCode = response.status;
        const responseText = await response.text();

        console.log(`\n📥 Resposta:`);
        console.log(`   Status: ${statusCode}`);
        console.log(`   Body: ${responseText}`);

        if (statusCode === 200) {
            console.log('\n✅ Edge Function está funcionando!');
        } else if (statusCode === 404) {
            console.log('\n❌ Edge Function não encontrada (404)');
            console.log('   -> Você precisa fazer o deploy da função');
        } else if (statusCode === 500) {
            console.log('\n⚠️ Edge Function retornou erro interno (500)');
            console.log('   -> A função existe mas pode haver erro no código');
        } else {
            console.log('\n⚠️ Status inesperado');
        }

    } catch (err) {
        console.error('❌ Erro:', err.message);
        if (err.message.includes('ENOTFOUND')) {
            console.log('   -> Não foi possível conectar ao servidor');
        }
    }
}

testWebhook();
