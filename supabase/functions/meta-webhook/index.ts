import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        const url = new URL(req.url);

        // 1. GET Request: Verification Challenge
        if (req.method === 'GET') {
            const mode = url.searchParams.get('hub.mode');
            const token = url.searchParams.get('hub.verify_token');
            const challenge = url.searchParams.get('hub.challenge');

            if (mode && token) {
                if (mode === 'subscribe') {
                    // Find instance with this verify token
                    const { data: instance, error } = await supabase
                        .from('whatsapp_official_resources')
                        .select('id')
                        .eq('verify_token', token)
                        .single();

                    if (instance) {
                        console.log('WEBHOOK_VERIFIED');
                        return new Response(challenge, { status: 200 });
                    } else {
                        return new Response('Forbidden', { status: 403 });
                    }
                }
            }
            return new Response('BadRequest', { status: 400 });
        }

        // 2. POST Request: Receive Messages
        if (req.method === 'POST') {
            const body = await req.json();
            // console.log('Received Webhook:', JSON.stringify(body, null, 2));

            // Validate Structure
            if (body.object === 'whatsapp_business_account') {
                for (const entry of body.entry) {
                    for (const change of entry.changes) {
                        const value = change.value;
                        const metadata = value.metadata;

                        if (value.messages && value.messages.length > 0) {
                            const message = value.messages[0];
                            const from = message.from; // Phone number (sender)
                            const timestamp = message.timestamp;
                            const phone_number_id = metadata.phone_number_id;

                            // Find instance by phone_number_id
                            const { data: config } = await supabase
                                .from('whatsapp_official_resources')
                                .select('instance_id, instances!inner(id, user_id, name)')
                                .eq('phone_number_id', phone_number_id)
                                .single();

                            if (!config) {
                                console.log('No instance found for phone_id:', phone_number_id);
                                continue;
                            }

                            const instanceId = config.instance_id;
                            const userId = config.instances.user_id;
                            const instanceName = config.instances.name;

                            // Normalize Message Content
                            let msgType = message.type;
                            let msgContent = '';
                            let mediaUrl = null;
                            let mediaType = null;

                            if (msgType === 'text') {
                                msgContent = message.text.body;
                            } else if (msgType === 'button') {
                                msgContent = message.button.text;
                                msgType = 'text'; // Treat as text for simplicity
                            } else if (msgType === 'interactive') {
                                if (message.interactive.type === 'button_reply') {
                                    msgContent = message.interactive.button_reply.id; // or title
                                    msgType = 'text';
                                } else if (message.interactive.type === 'list_reply') {
                                    msgContent = message.interactive.list_reply.id;
                                    msgType = 'text';
                                }
                            } else if (msgType === 'image') {
                                msgContent = message.image.caption || '';
                                mediaType = 'image';
                                mediaUrl = message.image.id; // We need to fetch URL later using ID
                            } else if (msgType === 'video') {
                                msgContent = message.video.caption || '';
                                mediaType = 'video';
                                mediaUrl = message.video.id;
                            } else if (msgType === 'audio') {
                                mediaType = 'audio';
                                mediaUrl = message.audio.id;
                            } else if (msgType === 'document') {
                                msgContent = message.document.caption || message.document.filename;
                                mediaType = 'document';
                                mediaUrl = message.document.id;
                            } else if (msgType === 'sticker') {
                                msgContent = '[Sticker]';
                                mediaType = 'image';
                                mediaUrl = message.sticker.id;
                            } else {
                                msgContent = `[${msgType}]`;
                            }

                            const remoteJid = `${from}@s.whatsapp.net`;
                            const contactName = value.contacts?.[0]?.profile?.name || from;
                            const msgTimestamp = new Date(parseInt(timestamp) * 1000).toISOString();

                            // 3. Upsert Contact
                            await supabase.from('contacts').upsert({
                                user_id: userId,
                                name: contactName,
                                remote_jid: remoteJid,
                                profile_pic_url: null // Meta doesn't allow fetching profile pic easily without permission
                            }, { onConflict: 'remote_jid' });

                            // 4. Upsert Conversation
                            let { data: existingConv } = await supabase.from('conversations')
                                .select('*')
                                .eq('remote_jid', remoteJid)
                                .eq('instance_id', instanceId)
                                .single();

                            let convId;

                            if (existingConv) {
                                convId = existingConv.id;
                                await supabase.from('conversations').update({
                                    last_message: msgContent || (mediaType ? `[${mediaType}]` : 'Msg'),
                                    last_message_time: msgTimestamp,
                                    unread_count: (existingConv.unread_count || 0) + 1,
                                    contact_name: contactName
                                }).eq('id', convId);
                            } else {
                                const { data: newConv } = await supabase.from('conversations').insert({
                                    user_id: userId,
                                    instance_id: instanceId,
                                    remote_jid: remoteJid,
                                    contact_name: contactName,
                                    last_message: msgContent || (mediaType ? `[${mediaType}]` : 'Msg'),
                                    last_message_time: msgTimestamp,
                                    unread_count: 1
                                }).select().single();
                                if (newConv) convId = newConv.id;
                            }

                            if (!convId) continue;

                            // 5. Insert Message
                            const { error: insertError } = await supabase.from('messages').insert({
                                conversation_id: convId,
                                text: msgContent,
                                sender: 'contact',
                                timestamp: msgTimestamp,
                                status: 'received',
                                media_url: mediaUrl, // Usually ID, requires separate fetch
                                media_type: mediaType,
                                wamid: message.id,
                                instance_id: instanceId // Redundant? Schema usually has it on conversation but some views might use it
                            });

                            if (insertError) {
                                console.error('Error saving message:', insertError);
                            }

                            // 6. Trigger Evolution Compatible Logic (System API Hook)
                            // Ideally, we replicate the flow/AI logic here, but keeping it simple for now as requested "Messages arriving".
                            // If user needs AI/Bot on official, we can copy logic from evolution-webhook later.

                        }
                    }
                }
                return new Response('EVENT_RECEIVED', { status: 200 });
            }

            return new Response('NotFound', { status: 404 });
        }

        return new Response('Method Not Allowed', { status: 405 });

    } catch (error) {
        console.error(error);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        });
    }
});
