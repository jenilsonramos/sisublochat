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

        // 1. GET Request: Verification Challenge
        if (req.method === 'GET') {
            const url = new URL(req.url);
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
            console.log('Received Webhook:', JSON.stringify(body, null, 2));

            // Validate Structure
            if (body.object === 'whatsapp_business_account') {
                for (const entry of body.entry) {
                    for (const change of entry.changes) {
                        const value = change.value;
                        const metadata = value.metadata;

                        if (value.messages && value.messages.length > 0) {
                            const message = value.messages[0];
                            const from = message.from; // Phone number
                            const timestamp = message.timestamp;

                            const phone_number_id = metadata.phone_number_id;

                            // Find instance by phone_number_id
                            const { data: config } = await supabase
                                .from('whatsapp_official_resources')
                                .select('instance_id, instances(user_id)')
                                .eq('phone_number_id', phone_number_id)
                                .single();

                            if (!config) {
                                console.log('No instance found for phone_id:', phone_number_id);
                                continue;
                            }

                            // Normalize Message Content
                            let msgType = message.type;
                            let msgContent = '';
                            let mediaUrl = ''; // For images/audio

                            if (msgType === 'text') {
                                msgContent = message.text.body;
                            } else if (msgType === 'button') {
                                msgContent = message.button.text;
                                msgType = 'text'; // Treat as text for simplicity in evolution
                            } else if (msgType === 'interactive') {
                                if (message.interactive.type === 'button_reply') {
                                    msgContent = message.interactive.button_reply.id; // or title
                                    msgType = 'text';
                                } else if (message.interactive.type === 'list_reply') {
                                    msgContent = message.interactive.list_reply.id;
                                    msgType = 'text';
                                }
                            }
                            // TODO: Handle Media extraction (Meta gives an ID, need to fetch URL)

                            // Insert into messages table
                            const { error: insertError } = await supabase.from('messages').insert({
                                instance_id: config.instance_id,
                                role: 'user', // From user
                                content: msgContent,
                                message_type: msgType,
                                remote_jid: `${from}@s.whatsapp.net`,
                                push_name: value.contacts?.[0]?.profile?.name || from
                            });

                            if (insertError) {
                                console.error('Error saving message:', insertError);
                            }

                            // Trigger Chatbot Handler (if exists)
                            // We can just invoke the function or let a DB trigger do it.
                            // Existing architecture uses 'chatbot-handler' usually triggered by evolution endpoint or DB.
                            // If we are normalizing here, we should probably invoke chatbot-handler directly or rely on the Insert Trigger if one exists.
                            // Let's assume we invoke chatbot-handler or it listens to DB changes.
                            // Actually, for Evolution, usually the webhook receives and processes.
                            // Let's invoke chatbot-handler manually to ensure response.

                            await supabase.functions.invoke('chatbot-handler', {
                                body: {
                                    record: {
                                        instance_id: config.instance_id,
                                        content: msgContent,
                                        remote_jid: `${from}@s.whatsapp.net`,
                                        role: 'user',
                                        message_type: msgType
                                    } // Mocking the DB record payload
                                }
                            });
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
