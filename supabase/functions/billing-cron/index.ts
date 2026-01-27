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

        const body = await req.json().catch(() => ({}));
        const { action, settings: testSettings, to: testTo } = body;

        if (action === 'TEST_SMTP') {
            try {
                await sendEmail(testSettings, testTo, "Teste de Conexão SMTP - Ublo Chat", "Se você recebeu este e-mail, sua configuração de SMTP está correta!", { profiles: { full_name: 'Administrador' }, current_period_end: new Date().toISOString() });
                return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
            } catch (smtpErr) {
                console.error('SMTP Test Error:', smtpErr);
                return new Response(JSON.stringify({ error: smtpErr.message }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 400
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
        if (hour === 0) {
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
        if (hour === 9) {
            const { data: expiredToday } = await supabase
                .from('subscriptions')
                .select('*, profiles(full_name, email)')
                .eq('status', 'EXPIRED')
                .gte('updated_at', todayStr)

            for (const sub of expiredToday || []) {
                if (!sub.profiles?.email) continue

                // Check if already sent today
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
        if (hour === 14) {
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
        // Run every hour to catch subs that have been EXPIRED for > 24h
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
    console.log(`Connecting to SMTP: ${settings.smtp_host}:${settings.smtp_port} (User: ${settings.smtp_user})`);
    const client = new SMTPClient({
        connection: {
            hostname: settings.smtp_host,
            port: settings.smtp_port,
            tls: settings.smtp_port === 465, // Force TLS only for 465 (Implicit), others use STARTTLS
            auth: {
                username: settings.smtp_user,
                password: settings.smtp_pass,
            },
        },
    })

    const finalBody = body
        .replace(/\{\{user_name\}\}/g, sub.profiles.full_name || 'Usuário')
        .replace(/\{\{plan_name\}\}/g, 'Seu Plano')
        .replace(/\{\{expiry_date\}\}/g, new Date(sub.current_period_end).toLocaleDateString('pt-BR'))

    await client.send({
        from: `"${settings.from_name}" <${settings.from_email}>`,
        to,
        subject,
        content: finalBody,
    })

    await client.close()
}
