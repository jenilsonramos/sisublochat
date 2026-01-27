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

        const { action, apiKey } = await req.json()

        if (action === 'SETUP') {
            if (!apiKey) throw new Error("API Key is required");

            // 1. Save API Key
            const { error: saveError } = await supabaseClient
                .from('system_settings')
                .update({ cron_api_key: apiKey })
                .neq('id', '00000000-0000-0000-0000-000000000000'); // Updates all rows (usually just one) or use a specific ID if known. 
            // Better to assume single row or update based on a known condition. 
            // Ideally system_settings has a single row or we select one.
            // Let's assume user updates the single existing row or we insert if not exists (but here we update)
            // To be safe, let's fetch the ID first or update 'true'

            // Let's update the single row if we can find it, or just update all (usually system_settings is single row)
            // Check if there is a row
            const { data: existing } = await supabaseClient.from('system_settings').select('id, cron_job_id').single();

            if (existing) {
                await supabaseClient.from('system_settings').update({ cron_api_key: apiKey }).eq('id', existing.id);
            } else {
                // Create if not exists (should exist based on previous logic)
                await supabaseClient.from('system_settings').insert({ cron_api_key: apiKey });
            }


            // 2. Create Job on cron-job.org
            const projectUrl = Deno.env.get('SUPABASE_URL');
            const functionUrl = `${projectUrl}/functions/v1/evolution-cron`;
            // Service Role Key for the Cron Job to authenticate with our Edge Function
            const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

            const jobData = {
                job: {
                    url: functionUrl,
                    enabled: true,
                    saveResponses: true,
                    schedule: {
                        timezone: "America/Sao_Paulo",
                        expiresAt: 0,
                        hours: [-1], // Every hour
                        minutes: [-1], // Every minute
                        mdays: [-1], // Every day of month
                        months: [-1], // Every month
                        wdays: [-1] // Every day of week
                    },
                    title: "Evolution API Broadcast Worker",
                    requestMethod: 1, // POST
                    headers: [
                        { key: "Authorization", value: `Bearer ${serviceRoleKey}` },
                        { key: "Content-Type", value: "application/json" }
                    ]
                }
            };

            // If exists, delete first? Or Update?
            // Simpler: Delete old if exists in DB, then Create New.
            if (existing?.cron_job_id) {
                try {
                    await fetch(`https://api.cron-job.org/jobs/${existing.cron_job_id}`, {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${apiKey}`
                        }
                    });
                } catch (e) { console.log("Error deleting old job:", e) }
            }

            const createRes = await fetch('https://api.cron-job.org/jobs', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify(jobData)
            });

            if (!createRes.ok) {
                const errText = await createRes.text();
                throw new Error(`Failed to create cron job: ${errText}`);
            }

            const createJson = await createRes.json();
            const jobId = createJson.jobId;

            // 3. Save Job ID
            if (existing) {
                await supabaseClient.from('system_settings').update({ cron_job_id: jobId }).eq('id', existing.id);
            }

            return new Response(JSON.stringify({ success: true, jobId }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        if (action === 'DELETE') {
            const { data: settings } = await supabaseClient.from('system_settings').select('cron_job_id, cron_api_key').single();
            if (settings?.cron_job_id && settings?.cron_api_key) {
                await fetch(`https://api.cron-job.org/jobs/${settings.cron_job_id}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${settings.cron_api_key}`
                    }
                });
                await supabaseClient.from('system_settings').update({ cron_job_id: null, cron_api_key: null }).eq('id', settings.id); // Or keep api key? User probably wants to disable.
            }
            return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        throw new Error("Invalid Action");

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
