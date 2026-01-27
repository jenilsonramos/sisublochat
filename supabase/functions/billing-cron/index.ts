import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import nodemailer from "npm:nodemailer@6.9.9";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // Manual Auth Check
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            throw new Error("Missing Authorization header");
        }

        const token = authHeader.replace('Bearer ', '');
        const isServiceRole = token === Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!isServiceRole) {
            const { data: { user }, error: authError } = await supabase.auth.getUser(token);
            if (authError || !user) throw new Error("Unauthorized");
        }

        let body = {};
        try {
            const rawBody = await req.text();
            if (rawBody) body = JSON.parse(rawBody);
        } catch (e) {
            // body remains {}
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
                    status: 200 // Return 200 with error field so frontend handles it gracefully
                });
            }
        }

        // 1. Get Billing Settings
        const { data: settings } = await supabase.from('billing_settings').select('*').single()
        if (!settings || (!settings.smtp_host && !settings.resend_api_key)) { // Basic check
            return new Response(JSON.stringify({ error: "SMTP not configured" }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        const now = new Date()
        const hour = now.getHours()
        const todayStr = now.toISOString().split('T')[0]
        const results = []

        // --- TASK 1: Midnight (00:00) - Mark as EXPIRED ---
        if (currentAction === 'DAILY_CHECK' || currentAction === 'MARK_EXPIRED' || (currentAction === 'AUTO' && hour === 0)) {
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
        if (currentAction === 'DAILY_EMAIL' || currentAction === 'SEND_EXPIRY_EMAIL' || (currentAction === 'AUTO' && hour === 9)) {
            const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
            const { data: expiredToday } = await supabase
                .from('subscriptions')
                .select('*, profiles(full_name, email)')
                .eq('status', 'EXPIRED')
                .gt('updated_at', oneDayAgo);

            for (const sub of expiredToday || []) {
                if (!sub.profiles?.email) continue

                // Check duplicates (idempotency)
                const { data: log } = await supabase.from('billing_notifications_log')
                    .select('id').eq('subscription_id', sub.id).eq('notification_type', 'expiry').gte('sent_at', todayStr).single()

                if (!log) {
                    await sendEmail(settings, sub.profiles.email, settings.expiry_subject || 'Seu plano venceu', settings.expiry_body || 'Regularize sua assinatura', sub)
                    await supabase.from('billing_notifications_log').insert({ subscription_id: sub.id, notification_type: 'expiry' })
                    results.push({ subId: sub.id, action: 'Sent expiry email' })
                }
            }
        }

        return new Response(JSON.stringify({ success: true, results }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error) {
        console.error('Critical Function Error:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})

async function sendEmail(settings: any, to: string, subject: string, body: string, sub: any) {
    if (!settings?.smtp_host && !settings.smtp_pass) throw new Error("SMTP settings are incomplete");

    const userName = sub?.profiles?.full_name || 'Usuário';
    const expiryDate = sub?.current_period_end ? new Date(sub.current_period_end).toLocaleDateString('pt-BR') : '---';

    const finalBody = body
        .replace(/\{\{user_name\}\}/g, userName)
        .replace(/\{\{plan_name\}\}/g, 'Seu Plano')
        .replace(/\{\{expiry_date\}\}/g, expiryDate);

    // Support for ZeptoMail API (Hybrid Approach)
    if (settings.smtp_host && settings.smtp_host.includes('zeptomail.com')) {
        console.log(`Sending via ZeptoMail API to: ${to}`);
        const response = await fetch("https://api.zeptomail.com/v1.1/email", {
            method: "POST",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "Authorization": settings.smtp_pass.startsWith('Zoho-') ? settings.smtp_pass : `Zoho-enczapikey ${settings.smtp_pass}`
            },
            body: JSON.stringify({
                from: { address: settings.smtp_email || settings.from_email, name: settings.company_name || settings.from_name },
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

    // Traditional SMTP using Nodemailer
    console.log(`Connecting to SMTP (Nodemailer): ${settings.smtp_host}:${settings.smtp_port}`);

    const transporter = nodemailer.createTransport({
        host: settings.smtp_host,
        port: parseInt(settings.smtp_port),
        secure: parseInt(settings.smtp_port) === 465, // true for 465, false for other ports
        auth: {
            user: settings.smtp_user,
            pass: settings.smtp_pass,
        },
    });

    await transporter.sendMail({
        from: `"${settings.company_name || settings.from_name || 'Sistema'}" <${settings.smtp_email || settings.from_email}>`,
        to: to,
        subject: subject,
        html: `<div>${finalBody.replace(/\n/g, '<br>')}</div>`,
    });
}
