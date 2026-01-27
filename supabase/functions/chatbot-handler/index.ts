
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseKey)

async function logDb(content: string) {
    try {
        await supabase.from('debug_logs').insert({ content: `Chatbot: ${content.substring(0, 5000)}` })
    } catch (e) {
        console.error('Log failed', e)
    }
}

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

Deno.serve(async (req) => {
    try {
        const payload = await req.json()
        const { record, type, table } = payload

        if (type !== 'INSERT' || table !== 'messages') {
            return new Response('Skipping', { status: 200 })
        }

        if (record.sender !== 'contact') {
            return new Response('Skipping outgoing', { status: 200 })
        }

        const messageText = (record.text || '').toLowerCase().trim()
        const conversationId = record.conversation_id

        // 1. Find User ID and Instance from Conversation
        const { data: convData, error: convError } = await supabase
            .from('conversations')
            .select('user_id, remote_jid, last_greeted_at, contact_name')
            .eq('id', conversationId)
            .single()

        if (convError || !convData) {
            await logDb(`Conversation ${conversationId} not found or error: ${convError?.message}`)
            return new Response('Not found', { status: 404 })
        }

        const userId = convData.user_id
        const remoteJid = convData.remote_jid
        const lastGreetedAt = convData.last_greeted_at
        const contactName = convData.contact_name || ''

        // 1.1 Check Owner Status (Blocking)
        const { data: profile } = await supabase
            .from('profiles')
            .select('status, role')
            .eq('id', userId)
            .single()

        if (profile?.status === 'INACTIVE' && profile?.role !== 'ADMIN') {
            await logDb(`Skipping chatbots for ${remoteJid} (User ${userId} is BLOCKED)`)
            return new Response('User Blocked', { status: 200 })
        }

        // 1.5. Check if Gemini AI is enabled (Precedence)
        const { data: aiSettings } = await supabase
            .from('ai_settings')
            .select('enabled')
            .eq('user_id', userId)
            .single();

        if (aiSettings?.enabled) {
            await logDb(`Skipping chatbots for ${remoteJid} (IA Gemini ativa)`)
            return new Response('AI enabled', { status: 200 })
        }

        // Get Evolution config from system_settings instead of env
        const { data: settings } = await supabase.from('system_settings').select('api_url, api_key').single()
        const evolutionApiUrl = settings?.api_url
        const evolutionApiKey = settings?.api_key

        if (!evolutionApiUrl || !evolutionApiKey) {
            await logDb('Evolution API Config missing in system_settings')
            return new Response('No config', { status: 500 })
        }

        // Extract first name
        const firstName = contactName.split(' ')[0] || contactName

        const replaceVariables = (text: string): string => {
            return text
                .replace(/\{\{nome\}\}/gi, contactName)
                .replace(/\{\{primeiro_nome\}\}/gi, firstName)
                .replace(/\{\{telefone\}\}/gi, remoteJid.replace('@s.whatsapp.net', ''))
        }

        // 2. Find Active Bots
        const { data: bots } = await supabase
            .from('chatbots')
            .select('*')
            .eq('user_id', userId)
            .eq('status', 'ACTIVE')

        if (!bots || bots.length === 0) {
            return new Response('No active bots', { status: 200 })
        }

        // 2.5. Match Bot
        let matchedBot = null

        // Greeting bot logic
        const greetingBot = bots.find(bot => bot.type === 'GREETING')
        if (greetingBot) {
            const cooldownMatch = (greetingBot.trigger || '').match(/cooldown:(\d+)/)
            const cooldownHours = cooldownMatch ? parseInt(cooldownMatch[1]) : 24

            let shouldGreet = true
            if (lastGreetedAt) {
                const lastGreeted = new Date(lastGreetedAt)
                const now = new Date()
                const hoursSinceGreeting = (now.getTime() - lastGreeted.getTime()) / (1000 * 60 * 60)
                shouldGreet = hoursSinceGreeting >= cooldownHours
            }

            if (shouldGreet) {
                matchedBot = greetingBot
                await supabase.from('conversations').update({ last_greeted_at: new Date().toISOString() }).eq('id', conversationId)
            }
        }

        // Keyword Match if no greeting
        if (!matchedBot) {
            matchedBot = bots.find(bot => {
                if (bot.type === 'GREETING') return false
                const triggerStr = (bot.trigger || '').toLowerCase().trim()
                if (triggerStr === 'sempre') return true

                const triggers = triggerStr.split(',').map(t => t.trim())
                const matchType = bot.match_type || 'contains'

                return triggers.some(t => {
                    if (!t) return false
                    if (matchType === 'exact') return messageText === t
                    if (matchType === 'starts') return messageText.startsWith(t)
                    if (matchType === 'ends') return messageText.endsWith(t)
                    return messageText.includes(t)
                })
            })
        }

        if (!matchedBot) return new Response('No match', { status: 200 })

        await logDb(`Bot matched: ${matchedBot.name} (ID: ${matchedBot.id})`)

        // 4. Fetch Steps
        const { data: steps } = await supabase
            .from('chatbot_steps')
            .select('*')
            .eq('chatbot_id', matchedBot.id)
            .order('order', { ascending: true })

        if (!steps || steps.length === 0) {
            await logDb(`No steps found for ${matchedBot.name}`)
            return new Response('No steps', { status: 200 })
        }

        // 5. Identify Instance & Channel Type
        const query = supabase.from('instances').select('id, name, channel_type');
        if (matchedBot.instance_id) {
            query.eq('id', matchedBot.instance_id);
        } else {
            // Find an open instance for this user
            // For Official, status is 'open' when created.
            // For Evolution, status is 'open'.
            query.eq('user_id', userId).eq('status', 'open').limit(1);
        }

        const { data: instanceData } = await query.single();

        if (!instanceData) {
            await logDb(`No active instance found for bot ${matchedBot.name}`)
            return new Response('No instance', { status: 200 })
        }

        const instanceName = instanceData.name;
        const channelType = instanceData.channel_type || 'evolution'; // Default to evolution

        // 6. Execute Steps
        for (const step of steps) {
            if (step.delay) await delay(step.delay * 1000)

            // --- OFFICIAL API STRATEGY ---
            if (channelType === 'official') {
                await logDb(`Sending via Official API: ${step.type}`);

                // Fetch Credentials
                const { data: creds } = await supabase
                    .from('whatsapp_official_resources')
                    .select('*')
                    .eq('instance_id', instanceData.id)
                    .single();

                if (!creds) {
                    await logDb('Credentials missing for Official Instance');
                    continue;
                }

                const phoneId = creds.phone_number_id;
                const token = creds.access_token;
                const targetNumber = remoteJid.replace('@s.whatsapp.net', '');

                let msgPayload: any = {
                    messaging_product: "whatsapp",
                    to: targetNumber,
                    type: "text",
                };

                // Type Handling
                if (step.type === 'text') {
                    msgPayload.type = 'text';
                    msgPayload.text = { body: replaceVariables(step.content) };
                } else if (step.type === 'image') {
                    msgPayload.type = 'image';
                    msgPayload.image = { link: step.content };
                } else if (step.type === 'audio') {
                    msgPayload.type = 'audio';
                    msgPayload.audio = { link: step.content };
                }

                // Send request to Meta
                try {
                    const res = await fetch(`https://graph.facebook.com/v18.0/${phoneId}/messages`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(msgPayload)
                    });

                    const resJson = await res.json();
                    if (!res.ok) {
                        await logDb(`Meta API Error: ${JSON.stringify(resJson)}`);
                    }
                } catch (err: any) {
                    await logDb(`Meta API Request Failed: ${err.message}`);
                }

            }
            // --- EVOLUTION API STRATEGY (Legacy) ---
            else {
                const presenceType = step.type === 'audio' ? 'recording' : 'composing'
                await fetch(`${evolutionApiUrl}/chat/sendPresence/${instanceName}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'apikey': evolutionApiKey! },
                    body: JSON.stringify({ number: remoteJid, delay: 3000, presence: presenceType })
                }).catch(() => { })

                await delay(2000) // Sim typing

                let endpoint = '/message/sendText'
                let body: any = { number: remoteJid }

                if (step.type === 'text') {
                    body.text = replaceVariables(step.content)
                } else if (step.type === 'image') {
                    endpoint = '/message/sendMedia'
                    body.media = step.content
                    body.mediatype = 'image'
                } else if (step.type === 'audio') {
                    endpoint = '/message/sendWhatsAppAudio'
                    body.audio = step.content
                }

                const res = await fetch(`${evolutionApiUrl}${endpoint}/${instanceName}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'apikey': evolutionApiKey! },
                    body: JSON.stringify(body)
                })

                await logDb(`Step ${step.type} sent to ${instanceName} (Evolution). Status: ${res.status}`)
            }
        }

        await supabase.from('chatbots').update({ last_run: new Date().toISOString() }).eq('id', matchedBot.id)
        return new Response('Processed', { status: 200 })

    } catch (error) {
        await logDb(`Handler Error: ${error.message}`)
        return new Response(error.message, { status: 500 })
    }
})
