import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const authHeader = req.headers.get('Authorization');
        if (!authHeader) throw new Error("Missing Authorization header");

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

        if (authError || !user) {
            console.error("Auth Error:", authError);
            throw new Error("Unauthorized: Invalid Token");
        }

        const rawBody = await req.text();
        let body: any = {};
        try {
            if (rawBody) body = JSON.parse(rawBody);
        } catch (e) {
            body = {};
        }

        const { action, apiKey, jobId } = body

        if (action === 'LIST') {
            const { data: jobs, error } = await supabaseClient.from('cron_jobs').select('*').order('created_at', { ascending: true });
            if (error) throw error;
            return new Response(JSON.stringify(jobs), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        if (action === 'SETUP') {
            if (!apiKey) throw new Error("API Key is required");

            await supabaseClient.from('system_settings').update({ cron_api_key: apiKey }).neq('id', '00000000-0000-0000-0000-000000000000');

            const projectUrl = Deno.env.get('SUPABASE_URL');
            const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

            const cronJobConfigs = [
                {
                    name: "Broadcast: Processador de Filas",
                    job_type: "broadcast",
                    url: `${projectUrl}/functions/v1/evolution-cron`,
                    schedule: { hours: [-1], minutes: [0] },
                    action: "AUTO"
                },
                {
                    name: "Faturamento: Marcar Vencidos",
                    job_type: "billing_mark_expired",
                    url: `${projectUrl}/functions/v1/billing-cron`,
                    schedule: { mdays: [-1], months: [-1], wdays: [-1], hours: [0], minutes: [0] },
                    action: "MARK_EXPIRED"
                },
                {
                    name: "Faturamento: Enviar E-mail de Expiração",
                    job_type: "billing_send_expiry",
                    url: `${projectUrl}/functions/v1/billing-cron`,
                    schedule: { mdays: [-1], months: [-1], wdays: [-1], hours: [9], minutes: [0] },
                    action: "SEND_EXPIRY_EMAIL"
                },
                {
                    name: "Faturamento: Lembretes de Renovação",
                    job_type: "billing_reminders",
                    url: `${projectUrl}/functions/v1/billing-cron`,
                    schedule: { mdays: [-1], months: [-1], wdays: [-1], hours: [14], minutes: [0] },
                    action: "SEND_REMINDERS"
                },
                {
                    name: "Faturamento: Verificação de Bloqueio 24h",
                    job_type: "billing_check_blockage",
                    url: `${projectUrl}/functions/v1/billing-cron`,
                    schedule: { hours: [-1], minutes: [30] },
                    action: "CHECK_BLOCKAGE"
                }
            ];

            // 1. Clean up EXTERNAL jobs
            const listRes = await fetch('https://api.cron-job.org/jobs', {
                headers: { 'Authorization': `Bearer ${apiKey}` }
            });
            if (listRes.ok) {
                const listData = await listRes.json();
                const ourJobNames = cronJobConfigs.map(c => c.name);
                for (const job of listData.jobs || []) {
                    if (ourJobNames.includes(job.title)) {
                        await fetch(`https://api.cron-job.org/jobs/${job.jobId}`, {
                            method: 'DELETE',
                            headers: { 'Authorization': `Bearer ${apiKey}` }
                        }).catch(() => { });
                        await sleep(300); // delay between deletes
                    }
                }
            }

            // Clear database
            await supabaseClient.from('cron_jobs').delete().neq('id', '00000000-0000-0000-0000-000000000000');

            const results = [];
            for (const config of cronJobConfigs) {
                const jobPayload = {
                    job: {
                        url: config.url,
                        enabled: true,
                        saveResponses: true,
                        schedule: {
                            timezone: "America/Sao_Paulo",
                            expiresAt: 0,
                            ...config.schedule
                        },
                        title: config.name,
                        requestMethod: 1, // POST
                        headers: [
                            { key: "Authorization", value: `Bearer ${serviceRoleKey}` },
                            { key: "Content-Type", value: "application/json" }
                        ],
                        body: JSON.stringify({ trigger_action: config.action })
                    }
                };

                await sleep(500); // 500ms delay between creations to avoid rate limits

                const res = await fetch('https://api.cron-job.org/jobs', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
                    body: JSON.stringify(jobPayload)
                });

                if (res.ok) {
                    const json = await res.json();
                    await supabaseClient.from('cron_jobs').insert({
                        name: config.name,
                        job_type: config.job_type,
                        cron_job_id: json.jobId,
                        schedule: JSON.stringify(config.schedule),
                        enabled: true
                    });
                    results.push({ name: config.name, status: 'success', jobId: json.jobId });
                } else {
                    let errDetail = "";
                    try {
                        const errJson = await res.json();
                        errDetail = errJson.error?.message || JSON.stringify(errJson);
                    } catch {
                        errDetail = await res.text() || `Status ${res.status}`;
                    }
                    results.push({ name: config.name, status: 'error', details: errDetail });
                }
            }

            const hasError = results.some(r => r.status === 'error');
            return new Response(JSON.stringify({ success: !hasError, results }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        if (action === 'TOGGLE' || action === 'DELETE') {
            const { data: settings } = await supabaseClient.from('system_settings').select('cron_api_key').single();
            if (!settings?.cron_api_key) throw new Error("Cron API Key not found");

            const { data: job } = await supabaseClient.from('cron_jobs').select('*').eq('cron_job_id', jobId).single();
            if (!job) throw new Error("Job not found in database");

            if (action === 'DELETE') {
                await fetch(`https://api.cron-job.org/jobs/${jobId}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${settings.cron_api_key}` }
                });
                await supabaseClient.from('cron_jobs').delete().eq('cron_job_id', jobId);
            } else {
                const newEnabled = !job.enabled;
                const updateRes = await fetch(`https://api.cron-job.org/jobs/${jobId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${settings.cron_api_key}` },
                    body: JSON.stringify({ job: { enabled: newEnabled } })
                });

                if (!updateRes.ok) throw new Error("Failed to toggle job externally");
                await supabaseClient.from('cron_jobs').update({ enabled: newEnabled }).eq('cron_job_id', jobId);
            }

            return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        throw new Error("Invalid Action");

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
