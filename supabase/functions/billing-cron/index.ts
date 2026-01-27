import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // Manual Auth Check (since verify_jwt: false)
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            throw new Error("Missing Authorization header");
        }

        const token = authHeader.replace('Bearer ', '');

        // Check if it's the Service Role Key (Cron jobs use this)
        const isServiceRole = token === Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!isServiceRole) {
            // It might be a User JWT from the Admin panel
            const { data: { user }, error: authError } = await supabase.auth.getUser(token);
            if (authError || !user) {
                throw new Error("Unauthorized: Invalid Token or Service Role Key");
            }
        }

        // Robust body parsing
        const rawBody = await req.text();
        let body;
        try {
            body = JSON.parse(rawBody);
        } catch (e) {
            body = {};
        }

        const { action, trigger_action, settings: testSettings, to: testTo } = body;
        const currentAction = action || trigger_action || 'AUTO';
        console.log(`Action requested: ${currentAction}`);

        if (currentAction === 'TEST_SMTP') {
            try {
                await sendEmail(testSettings, testTo, "Teste de Conexão SMTP - Ublo Chat", "Se você recebeu este e-mail, sua configuração de SMTP está correta!", { profiles: { full_name: 'Administrador' }, current_period_end: new Date().toISOString() });
                return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
            } catch (smtpErr) {
                console.error('SMTP Test Error:', smtpErr);
                return new Response(JSON.stringify({ error: smtpErr.message }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 200
                });
            }
        }

        // 1. Get Billing Settings
        const { data: settings } = await supabase.from('billing_settings').select('*').single()
        if (!settings || !settings.smtp_host) {
            return new Response(JSON.stringify({ error: "SMTP not configured" }), { status: 200 })
        }

        const now = new Date()
        const hour = now.getHours()
        const todayStr = now.toISOString().split('T')[0]
        const results = []

        // --- TASK 1: Midnight (00:00) - Mark as EXPIRED ---
        if (currentAction === 'MARK_EXPIRED' || (currentAction === 'AUTO' && hour === 0)) {
            const { data: expiringToday } = await supabase
                .from('subscriptions')
                .select('id, user_id')
                .eq('status', 'ACTIVE')
                .lte('current_period_end', now.toISOString())

            for (const sub of expiringToday || []) {
                await supabase.from('subscriptions').update({ status: 'EXPIRED' }).eq('id', sub.id)
                results.push({ subId: sub.id, action: 'Marked as EXPIRED' })
            }
        }

        // --- TASK 2: Morning (09:00) - Expired Email ---
        if (currentAction === 'SEND_EXPIRY_EMAIL' || (currentAction === 'AUTO' && hour === 9)) {
            const { data: expiredToday } = await supabase
                .from('subscriptions')
                .select('*, profiles(full_name, email)')
                .eq('status', 'EXPIRED')
                .gte('updated_at', todayStr)

            for (const sub of expiredToday || []) {
                if (!sub.profiles?.email) continue

                const { data: log } = await supabase.from('billing_notifications_log')
                    .select('id').eq('subscription_id', sub.id).eq('notification_type', 'expiry').gte('sent_at', todayStr).single()

                if (!log) {
                    await sendEmail(settings, sub.profiles.email, settings.expiry_subject, settings.expiry_body, sub)
                    await supabase.from('billing_notifications_log').insert({ subscription_id: sub.id, notification_type: 'expiry' })
                    results.push({ subId: sub.id, action: 'Sent expiry email' })
                }
            }
        }

        // --- TASK 3: Afternoon (14:00) - Reminders (3d, 2d, Today 0h) ---
        if (currentAction === 'SEND_REMINDERS' || (currentAction === 'AUTO' && hour === 14)) {
            const days = [3, 2, 0]
            for (const d of days) {
                const targetDate = d === 0 ? todayStr : new Date(now.getTime() + d * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                const type = d === 0 ? '0d' : `${d}d`

                const { data: subs } = await supabase
                    .from('subscriptions')
                    .select('*, profiles(full_name, email)')
                    .eq('status', 'ACTIVE')
                    .filter('current_period_end', 'ilike', `%${targetDate}%`)

                for (const sub of subs || []) {
                    if (!sub.profiles?.email) continue

                    const { data: log } = await supabase.from('billing_notifications_log')
                        .select('id').eq('subscription_id', sub.id).eq('notification_type', type).gte('sent_at', todayStr).single()

                    if (!log) {
                        const subject = settings[`reminder_${type}_subject`]
                        const body = settings[`reminder_${type}_body`]
                        await sendEmail(settings, sub.profiles.email, subject, body, sub)
                        await supabase.from('billing_notifications_log').insert({ subscription_id: sub.id, notification_type: type })
                        results.push({ subId: sub.id, action: `Sent ${type} reminder` })
                    }
                }
            }
        }

        // --- TASK 4: 24h Blockage Check ---
        if (currentAction === 'CHECK_BLOCKAGE' || currentAction === 'AUTO') {
            const { data: blockingSubs } = await supabase
                .from('subscriptions')
                .select('*, profiles(full_name, email)')
                .eq('status', 'EXPIRED')
                .lte('updated_at', new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString())

            for (const sub of blockingSubs || []) {
                await supabase.from('subscriptions').update({ status: 'BLOCKED' }).eq('id', sub.id)

                const { data: log } = await supabase.from('billing_notifications_log')
                    .select('id').eq('subscription_id', sub.id).eq('notification_type', 'blockage').single()

                if (!log && sub.profiles?.email) {
                    await sendEmail(settings, sub.profiles.email, settings.blockage_subject, settings.blockage_body, sub)
                    await supabase.from('billing_notifications_log').insert({ subscription_id: sub.id, notification_type: 'blockage' })
                }
                results.push({ subId: sub.id, action: 'Blocked plan' })
            }
        }

        return new Response(JSON.stringify({ success: true, results }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error) {
        console.error('Global Function Error:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})

async function sendEmail(settings: any, to: string, subject: string, body: string, sub: any) {
    if (!settings?.smtp_host) throw new Error("SMTP settings are incomplete");

    const userName = sub?.profiles?.full_name || 'Usuário';
    const expiryDate = sub?.current_period_end ? new Date(sub.current_period_end).toLocaleDateString('pt-BR') : '---';

    const finalBody = body
        .replace(/\{\{user_name\}\}/g, userName)
        .replace(/\{\{plan_name\}\}/g, 'Seu Plano')
        .replace(/\{\{expiry_date\}\}/g, expiryDate);

    // Support for ZeptoMail API
    if (settings.smtp_host.includes('zeptomail.com')) {
        console.log(`Sending via ZeptoMail API to: ${to}`);
        const response = await fetch("https://api.zeptomail.com/v1.1/email", {
            method: "POST",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "Authorization": settings.smtp_pass.startsWith('Zoho-') ? settings.smtp_pass : `Zoho-enczapikey ${settings.smtp_pass}`
            },
            body: JSON.stringify({
                from: { address: settings.from_email, name: settings.from_name },
                to: [{ email_address: { address: to, name: userName } }],
                subject: subject,
                htmlbody: `<div>${finalBody.replace(/\n/g, '<br>')}</div>`
            })
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`ZeptoMail API Error: ${error}`);
        }
        return;
    }

    // Traditional SMTP
    console.log(`Connecting to SMTP: ${settings.smtp_host}:${settings.smtp_port}`);
    const client = new SMTPClient({
        connection: {
            hostname: settings.smtp_host,
            port: settings.smtp_port,
            tls: parseInt(settings.smtp_port) === 465,
            auth: {
                username: settings.smtp_user,
                password: settings.smtp_pass,
            },
        },
    })

    try {
        await client.send({
            from: `"${settings.from_name}" <${settings.from_email}>`,
            to,
            subject,
            content: finalBody,
        });
    } finally {
        try {
            await client.close();
        } catch (e) {
            console.error('Error closing SMTP:', e);
        }
    }
}
