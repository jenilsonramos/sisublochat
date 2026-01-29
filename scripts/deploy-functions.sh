#!/bin/bash
# =============================================================================
# Script de Deploy das Edge Functions para Supabase Self-Hosted
# Ublo Chat - Evolution API Integration
# =============================================================================

set -e

echo "🚀 Deploy das Edge Functions - Ublo Chat"
echo "========================================="

# Configurações
SUPABASE_DIR="${SUPABASE_DIR:-/root/supabase}"
FUNCTIONS_VOLUME="${SUPABASE_DIR}/docker/volumes/functions"

# Criar diretório se não existir
mkdir -p "$FUNCTIONS_VOLUME/evolution-webhook"
mkdir -p "$FUNCTIONS_VOLUME/billing-cron"
mkdir -p "$FUNCTIONS_VOLUME/chatbot-handler"
mkdir -p "$FUNCTIONS_VOLUME/cron-manager"
mkdir -p "$FUNCTIONS_VOLUME/evolution-cron"
mkdir -p "$FUNCTIONS_VOLUME/meta-webhook"

echo "📁 Criando Edge Functions..."

# ============================================================================
# 1. Evolution Webhook - Principal função para processar mensagens do WhatsApp
# ============================================================================
cat > "$FUNCTIONS_VOLUME/evolution-webhook/index.ts" << 'EVOLUTION_WEBHOOK_EOF'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const supabase = createClient(supabaseUrl!, supabaseKey!)

async function logDb(content: string) {
    try { await supabase.from('debug_logs').insert({ content: content.substring(0, 10000) }) } catch (e) { }
}

Deno.serve(async (req) => {
    try {
        if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })
        const payload = await req.json()
        await logDb(`Webhook received: ${JSON.stringify(payload)}`)

        const eventType = payload.type || payload.event
        const data = payload.data
        if (!eventType || !data) return new Response(JSON.stringify({ received: true }), { headers: { 'Content-Type': 'application/json' } })

        // Connection updates
        if (eventType === 'connection.update' || eventType === 'CONNECTION_UPDATE') {
            const state = data.state || 'unknown'
            const instanceName = payload.instance
            const ownerJid = data.ownerJid || data.wuid || payload.sender || null
            const updateData: any = { status: state }
            if (ownerJid) updateData.owner_id = ownerJid
            await supabase.from('instances').update(updateData).eq('name', instanceName)
            return new Response(JSON.stringify({ received: true }), { headers: { 'Content-Type': 'application/json' } })
        }

        // Only process message events
        if (eventType !== 'MESSAGES_UPSERT' && eventType !== 'messages.upsert') {
            return new Response(JSON.stringify({ received: true }), { headers: { 'Content-Type': 'application/json' } })
        }

        const messages = data.messages || (data.key ? [data] : [])
        if (!messages.length) return new Response(JSON.stringify({ received: true }), { headers: { 'Content-Type': 'application/json' } })

        const { instance } = payload
        const { data: instanceData, error: instError } = await supabase.from('instances').select('id, user_id').eq('name', instance).maybeSingle()

        if (!instanceData) {
            await logDb(`Webhook Skip: Instance mapping not found for ${instance}. Error: ${instError?.message}`)
            return new Response(JSON.stringify({ received: true }), { headers: { 'Content-Type': 'application/json' } })
        }

        const userId = instanceData.user_id
        const instanceId = instanceData.id

        // Get system settings for API calls
        const { data: settings } = await supabase.from('system_settings').select('api_url, api_key').maybeSingle()

        for (const msg of messages) {
            if (!msg.key || !msg.message) continue
            const remoteJid = msg.key.remoteJid
            const cleanJid = remoteJid.split(':')[0].split('@')[0] + '@' + remoteJid.split('@')[1]
            const fromMe = msg.key.fromMe
            const pushName = msg.pushName || (fromMe ? 'Me' : remoteJid.split('@')[0])

            // Parse Message Content
            let text = ''
            let mediaType = null
            let mediaUrl = null

            const m = msg.message
            if (m.conversation) { text = m.conversation }
            else if (m.extendedTextMessage) { text = m.extendedTextMessage.text }
            else if (m.imageMessage) { text = m.imageMessage.caption || ''; mediaType = 'image'; mediaUrl = m.imageMessage.url }
            else if (m.videoMessage) { text = m.videoMessage.caption || ''; mediaType = 'video'; mediaUrl = m.videoMessage.url }
            else if (m.audioMessage) { mediaType = 'audio'; mediaUrl = m.audioMessage.url }
            else if (m.documentMessage) { text = m.documentMessage.caption || m.documentMessage.fileName || 'Documento'; mediaType = 'document'; mediaUrl = m.documentMessage.url }
            else if (m.stickerMessage) { text = '[Sticker]'; mediaType = 'image'; mediaUrl = m.stickerMessage.url }
            else { text = '[Mídia]' }

            const timestamp = new Date((msg.messageTimestamp || Date.now() / 1000) * 1000).toISOString()

            // Upsert Contact & Conversation
            if (cleanJid && !cleanJid.includes('@g.us')) {
                await supabase.from('contacts').upsert({
                    user_id: userId,
                    name: pushName || cleanJid.split('@')[0],
                    remote_jid: cleanJid
                }, { onConflict: 'remote_jid' })
            }

            let { data: existingConv } = await supabase.from('conversations')
                .select('*')
                .eq('remote_jid', cleanJid)
                .eq('instance_id', instanceId)
                .maybeSingle()

            let convId

            if (existingConv) {
                convId = existingConv.id
                const updateData: any = {
                    user_id: userId,
                    instance_id: instanceId,
                    last_message: text || (mediaType ? `[${mediaType}]` : 'Msg'),
                    last_message_time: timestamp,
                    unread_count: fromMe ? 0 : (existingConv.unread_count || 0) + 1,
                    contact_name: (!existingConv.contact_name || existingConv.contact_name === remoteJid.split('@')[0]) ? pushName : existingConv.contact_name
                }

                if (existingConv.status === 'resolved') {
                    updateData.status = 'pending'
                }

                await supabase.from('conversations').update(updateData).eq('id', convId)
            } else {
                const { data: newConv } = await supabase.from('conversations').insert({
                    user_id: userId,
                    instance_id: instanceId,
                    remote_jid: cleanJid,
                    contact_name: pushName,
                    last_message: text || (mediaType ? `[${mediaType}]` : 'Msg'),
                    last_message_time: timestamp,
                    unread_count: fromMe ? 0 : 1
                }).select().maybeSingle()
                if (!newConv) continue
                convId = newConv.id
            }

            // Insert Message
            await supabase.from('messages').insert({
                conversation_id: convId,
                text: text,
                sender: fromMe ? 'me' : 'contact',
                timestamp: timestamp,
                status: 'sent',
                media_url: mediaUrl,
                media_type: mediaType,
                wamid: msg.key.id
            })
        }

        return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } })
    } catch (error) {
        await logDb(`GlobalError: ${error.message}`)
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } })
    }
})
EVOLUTION_WEBHOOK_EOF

echo "✅ evolution-webhook criado"

# ============================================================================
# 2. Billing Cron - Processamento de faturas
# ============================================================================
cat > "$FUNCTIONS_VOLUME/billing-cron/index.ts" << 'BILLING_CRON_EOF'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

Deno.serve(async (req) => {
    try {
        const now = new Date()
        
        // Buscar assinaturas que vencem hoje ou estão vencidas
        const { data: subscriptions, error } = await supabase
            .from('subscriptions')
            .select('*, profiles(email, name)')
            .eq('status', 'active')
            .lte('end_date', now.toISOString())

        if (error) throw error

        for (const sub of subscriptions || []) {
            // Marcar como expirada
            await supabase
                .from('subscriptions')
                .update({ status: 'expired' })
                .eq('id', sub.id)
        }

        return new Response(JSON.stringify({ 
            processed: subscriptions?.length || 0,
            timestamp: now.toISOString()
        }), { 
            headers: { 'Content-Type': 'application/json' } 
        })
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { 
            status: 500, 
            headers: { 'Content-Type': 'application/json' } 
        })
    }
})
BILLING_CRON_EOF

echo "✅ billing-cron criado"

# ============================================================================
# 3. Chatbot Handler - Processamento de fluxos de chatbot
# ============================================================================
cat > "$FUNCTIONS_VOLUME/chatbot-handler/index.ts" << 'CHATBOT_HANDLER_EOF'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

Deno.serve(async (req) => {
    if (req.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 })
    }

    try {
        const { conversationId, message, flowId } = await req.json()

        // Buscar o fluxo
        const { data: flow } = await supabase
            .from('flows')
            .select('*')
            .eq('id', flowId)
            .single()

        if (!flow) {
            return new Response(JSON.stringify({ error: 'Flow not found' }), { 
                status: 404, 
                headers: { 'Content-Type': 'application/json' } 
            })
        }

        // Processar nós do fluxo
        const nodes = flow.nodes || []
        const edges = flow.edges || []
        
        // Lógica básica de processamento
        const startNode = nodes.find((n: any) => n.type === 'start')
        
        return new Response(JSON.stringify({ 
            success: true,
            flowName: flow.name,
            nodeCount: nodes.length
        }), { 
            headers: { 'Content-Type': 'application/json' } 
        })
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { 
            status: 500, 
            headers: { 'Content-Type': 'application/json' } 
        })
    }
})
CHATBOT_HANDLER_EOF

echo "✅ chatbot-handler criado"

# ============================================================================
# 4. Cron Manager - Gerenciador de tarefas agendadas
# ============================================================================
cat > "$FUNCTIONS_VOLUME/cron-manager/index.ts" << 'CRON_MANAGER_EOF'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

Deno.serve(async (req) => {
    try {
        const now = new Date()
        
        // Buscar campanhas agendadas para agora
        const { data: campaigns } = await supabase
            .from('campaigns')
            .select('*')
            .eq('status', 'scheduled')
            .lte('scheduled_time', now.toISOString())

        let processed = 0
        for (const campaign of campaigns || []) {
            // Marcar como ativa
            await supabase
                .from('campaigns')
                .update({ status: 'active' })
                .eq('id', campaign.id)
            processed++
        }

        return new Response(JSON.stringify({ 
            processed,
            timestamp: now.toISOString()
        }), { 
            headers: { 'Content-Type': 'application/json' } 
        })
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { 
            status: 500, 
            headers: { 'Content-Type': 'application/json' } 
        })
    }
})
CRON_MANAGER_EOF

echo "✅ cron-manager criado"

# ============================================================================
# 5. Evolution Cron - Sincronização com Evolution API
# ============================================================================
cat > "$FUNCTIONS_VOLUME/evolution-cron/index.ts" << 'EVOLUTION_CRON_EOF'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

Deno.serve(async (req) => {
    try {
        // Buscar configurações do sistema
        const { data: settings } = await supabase
            .from('system_settings')
            .select('api_url, api_key')
            .maybeSingle()

        if (!settings?.api_url || !settings?.api_key) {
            return new Response(JSON.stringify({ error: 'API settings not configured' }), { 
                status: 400, 
                headers: { 'Content-Type': 'application/json' } 
            })
        }

        // Buscar instâncias do Evolution API
        const response = await fetch(`${settings.api_url}/instance/fetchInstances`, {
            headers: { 'apikey': settings.api_key }
        })

        if (!response.ok) {
            throw new Error(`Evolution API error: ${response.status}`)
        }

        const instances = await response.json()

        // Atualizar status das instâncias no banco
        for (const inst of instances) {
            await supabase
                .from('instances')
                .update({ status: inst.connectionStatus || inst.state || 'unknown' })
                .eq('name', inst.name)
        }

        return new Response(JSON.stringify({ 
            synced: instances.length,
            timestamp: new Date().toISOString()
        }), { 
            headers: { 'Content-Type': 'application/json' } 
        })
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { 
            status: 500, 
            headers: { 'Content-Type': 'application/json' } 
        })
    }
})
EVOLUTION_CRON_EOF

echo "✅ evolution-cron criado"

# ============================================================================
# 6. Meta Webhook - Webhook para Meta/Facebook (futuro)
# ============================================================================
cat > "$FUNCTIONS_VOLUME/meta-webhook/index.ts" << 'META_WEBHOOK_EOF'
Deno.serve(async (req) => {
    // Verificação do webhook do Meta
    if (req.method === 'GET') {
        const url = new URL(req.url)
        const mode = url.searchParams.get('hub.mode')
        const token = url.searchParams.get('hub.verify_token')
        const challenge = url.searchParams.get('hub.challenge')

        if (mode === 'subscribe' && token === Deno.env.get('META_VERIFY_TOKEN')) {
            return new Response(challenge, { status: 200 })
        }
        return new Response('Forbidden', { status: 403 })
    }

    // Processar eventos do Meta
    if (req.method === 'POST') {
        try {
            const payload = await req.json()
            console.log('Meta webhook:', JSON.stringify(payload))
            
            return new Response(JSON.stringify({ received: true }), { 
                headers: { 'Content-Type': 'application/json' } 
            })
        } catch (error) {
            return new Response(JSON.stringify({ error: error.message }), { 
                status: 500, 
                headers: { 'Content-Type': 'application/json' } 
            })
        }
    }

    return new Response('Method not allowed', { status: 405 })
})
META_WEBHOOK_EOF

echo "✅ meta-webhook criado"

# ============================================================================
# Finalização
# ============================================================================
echo ""
echo "========================================="
echo "✅ Todas as Edge Functions foram criadas!"
echo "========================================="
echo ""
echo "📁 Localização: $FUNCTIONS_VOLUME"
echo ""
echo "🔄 Reiniciando o Edge Runtime..."

# Tentar reiniciar o container (diferentes nomes possíveis)
docker restart supabase-edge-functions 2>/dev/null || \
docker restart supabase_edge_runtime 2>/dev/null || \
docker restart edge-runtime 2>/dev/null || \
echo "⚠️ Não foi possível reiniciar automaticamente. Reinicie manualmente com: docker compose restart edge-runtime"

echo ""
echo "📡 URLs das funções:"
echo "   - https://SEU_DOMINIO/functions/v1/evolution-webhook"
echo "   - https://SEU_DOMINIO/functions/v1/billing-cron"
echo "   - https://SEU_DOMINIO/functions/v1/chatbot-handler"
echo "   - https://SEU_DOMINIO/functions/v1/cron-manager"
echo "   - https://SEU_DOMINIO/functions/v1/evolution-cron"
echo "   - https://SEU_DOMINIO/functions/v1/meta-webhook"
echo ""
echo "🎉 Deploy concluído!"
