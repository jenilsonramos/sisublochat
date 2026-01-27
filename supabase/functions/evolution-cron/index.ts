import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // 1. Buscar campanhas que estão PROCESSANDO ou PENDENTES (se foram iniciadas agora)
        // Buscamos apenas campanhas 'PROCESSING' que tenham mensagens 'PENDING'
        const { data: campaigns, error: campaignError } = await supabaseClient
            .from('campaigns')
            .select('*, instances(name)')
            .eq('status', 'PROCESSING')
            .limit(5); // Processa até 5 campanhas simultâneas por execução

        if (campaignError) throw campaignError;
        if (!campaigns || campaigns.length === 0) {
            return new Response(JSON.stringify({ message: 'No active campaigns to process' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        const { data: systemSettings } = await supabaseClient.from('system_settings').select('api_url, api_key').single();
        if (!systemSettings) throw new Error("System settings not found");

        const results = [];

        for (const campaign of campaigns) {
            // 2. Para cada campanha, pegar um lote de mensagens PENDENTES
            // O tamanho do lote depende do limite de tempo da Edge Function e da taxa de envio
            // Vamos tentar enviar 5 mensagens por execução por campanha para evitar timeout
            const { data: messages, error: msgError } = await supabaseClient
                .from('campaign_messages')
                .select('*')
                .eq('campaign_id', campaign.id)
                .eq('status', 'PENDING')
                .limit(5);

            if (msgError) {
                console.error(`Error fetching messages for campaign ${campaign.id}:`, msgError);
                continue;
            }

            if (!messages || messages.length === 0) {
                // Se não tem mensagens pendentes, verifica se a campanha acabou
                const { count } = await supabaseClient
                    .from('campaign_messages')
                    .select('*', { count: 'exact', head: true })
                    .eq('campaign_id', campaign.id)
                    .eq('status', 'PENDING');

                if (count === 0) {
                    await supabaseClient.from('campaigns').update({ status: 'COMPLETED' }).eq('id', campaign.id);
                    results.push({ campaign: campaign.name, status: 'Completed' });
                }
                continue;
            }

            // 3. Enviar mensagens
            let sentCount = 0;
            let errorCount = 0;

            for (const msg of messages) {
                // Processar variáveis
                let text = campaign.message_template;
                if (msg.variables) {
                    Object.keys(msg.variables).forEach(key => {
                        text = text.replace(new RegExp(`\{\{${key}\}\}`, 'gi'), msg.variables[key]);
                    });
                }

                try {
                    // Delay aleatório baseado na configuração da campanha (simulado aqui, mas o ideal seria agendar)
                    // Como estamos num CRON que roda a cada minuto, o "delay" entre mensagens é controlado pelo 
                    // número de mensagens processadas por minuto. 
                    // Se quisermos ser estritos com o delay, teríamos que processar menos mensagens.
                    // Para esta implementação simples, vamos enviar o lote sequencialmente.

                    const response = await fetch(`${systemSettings.api_url}/message/sendText/${campaign.instances.name}`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'apikey': systemSettings.api_key
                        },
                        body: JSON.stringify({
                            number: msg.remote_jid,
                            text: text,
                            delay: 1000 // Pequeno delay nativo da API
                        })
                    });

                    if (response.ok) {
                        await supabaseClient.from('campaign_messages').update({ status: 'SENT', sent_at: new Date().toISOString() }).eq('id', msg.id);
                        await supabaseClient.rpc('increment_campaign_sent', { campaign_id: campaign.id });
                        sentCount++;
                    } else {
                        throw new Error('API Error');
                    }
                } catch (err) {
                    console.error(`Error sending message to ${msg.remote_jid}:`, err);
                    await supabaseClient.from('campaign_messages').update({ status: 'ERROR', error_message: 'Failed to send' }).eq('id', msg.id);
                    await supabaseClient.rpc('increment_campaign_error', { campaign_id: campaign.id });
                    errorCount++;
                }
            }
            results.push({ campaign: campaign.name, processed: messages.length, sent: sentCount, errors: errorCount });
        }

        return new Response(JSON.stringify({ success: true, results }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
