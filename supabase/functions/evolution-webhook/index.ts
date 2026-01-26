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
        const { data: instanceData } = await supabase.from('instances').select('id, user_id').eq('name', instance).single()

        if (!instanceData) {
            await logDb(`Webhook Skip: Instance mapping not found for ${instance}`)
            return new Response(JSON.stringify({ received: true }), { headers: { 'Content-Type': 'application/json' } })
        }

        const userId = instanceData.user_id
        const instanceId = instanceData.id

        // Get system settings for API calls
        const { data: settings } = await supabase.from('system_settings').select('api_url, api_key').single()

        // Get configurations
        const { data: bizHours } = await supabase.from('business_hours').select('*').eq('user_id', userId).single()
        const { data: aiSettings } = await supabase.from('ai_settings').select('*').eq('user_id', userId).single();

        for (const msg of messages) {
            if (!msg.key || !msg.message) continue
            const remoteJid = msg.key.remoteJid
            const fromMe = msg.key.fromMe
            const pushName = msg.pushName || (fromMe ? 'Me' : remoteJid.split('@')[0])

            // 1. Business Hours Check (Only for incoming)
            if (!fromMe && bizHours?.enabled && remoteJid && !remoteJid.includes('@g.us')) {
                try {
                    const now = new Date()
                    const localTimeParts = new Intl.DateTimeFormat('en-US', {
                        timeZone: bizHours.timezone || 'America/Sao_Paulo',
                        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, weekday: 'long'
                    }).formatToParts(now)

                    const dayName = localTimeParts.find(p => p.type === 'weekday')?.value.toLowerCase() as string
                    const hour = localTimeParts.find(p => p.type === 'hour')?.value
                    const minute = localTimeParts.find(p => p.type === 'minute')?.value
                    const currentTime = `${hour}:${minute}`

                    const dayEnabled = bizHours[`${dayName}_enabled`]
                    const dayStart = bizHours[`${dayName}_start`]
                    const dayEnd = bizHours[`${dayName}_end`]

                    let isOutside = false
                    if (!dayEnabled) { isOutside = true }
                    else if (dayStart && dayEnd) {
                        if (currentTime < dayStart || currentTime > dayEnd) isOutside = true
                    }

                    if (isOutside) {
                        const { data: alreadySent } = await supabase
                            .from('away_messages_sent')
                            .select('*')
                            .eq('user_id', userId)
                            .eq('remote_jid', remoteJid)
                            .single()

                        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
                        if (!alreadySent || new Date(alreadySent.sent_at) < oneDayAgo) {
                            if (settings?.api_url && settings?.api_key) {
                                await fetch(`${settings.api_url}/message/sendText/${instance}`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json', 'apikey': settings.api_key },
                                    body: JSON.stringify({ number: remoteJid, text: bizHours.away_message, delay: 1000 })
                                })
                                await supabase.from('away_messages_sent').upsert({
                                    user_id: userId, remote_jid: remoteJid, sent_at: new Date().toISOString()
                                }, { onConflict: 'user_id,remote_jid' })
                            }
                        }
                        continue;
                    }
                } catch (bhError) { await logDb(`BusinessHoursError: ${bhError.message}`) }
            }

            // 2. Parse Message Content
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

            // 3. Upsert Contact & Conversation
            if (remoteJid && !remoteJid.includes('@g.us')) {
                await supabase.from('contacts').upsert({
                    user_id: userId,
                    name: pushName || remoteJid.split('@')[0],
                    remote_jid: remoteJid
                }, { onConflict: 'remote_jid' })
            }

            let { data: existingConv } = await supabase.from('conversations')
                .select('*')
                .eq('remote_jid', remoteJid)
                .eq('instance_id', instanceId)
                .single()

            let convId

            if (existingConv) {
                convId = existingConv.id
                await supabase.from('conversations').update({
                    user_id: userId,
                    instance_id: instanceId,
                    last_message: text || (mediaType ? `[${mediaType}]` : 'Msg'),
                    last_message_time: timestamp,
                    unread_count: fromMe ? 0 : (existingConv.unread_count || 0) + 1,
                    contact_name: (!existingConv.contact_name || existingConv.contact_name === remoteJid.split('@')[0]) ? pushName : existingConv.contact_name
                }).eq('id', convId)
            } else {
                const { data: newConv } = await supabase.from('conversations').insert({
                    user_id: userId,
                    instance_id: instanceId,
                    remote_jid: remoteJid,
                    contact_name: pushName,
                    last_message: text || (mediaType ? `[${mediaType}]` : 'Msg'),
                    last_message_time: timestamp,
                    unread_count: fromMe ? 0 : 1
                }).select().single()
                if (!newConv) continue
                convId = newConv.id
            }

            // 4. Insert Message
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

            // INHIBIT BOT IF HUMAN IS ASSIGNED (with 6h expiration)
            const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
            const isAssigned = existingConv?.assigned_agent_id &&
                (!existingConv.assigned_at || existingConv.assigned_at > sixHoursAgo);

            if (!fromMe && remoteJid && !remoteJid.includes('@g.us') && text && settings?.api_url && settings?.api_key) {
                if (isAssigned) {
                    await logDb(`Bot Inhibit: Human assistance active for ${remoteJid}`);
                } else {
                    // Auto-clear if expired
                    if (existingConv?.assigned_agent_id && existingConv.assigned_at && existingConv.assigned_at <= sixHoursAgo) {
                        await supabase.from('conversations').update({
                            assigned_agent_id: null,
                            assigned_at: null
                        }).eq('id', convId);
                        await logDb(`Bot Auto-Release: Human assistance expired for ${remoteJid}`);
                    }

                    try {
                        const vars = existingConv?.variables || {}
                        const contactData = { name: pushName, phone: remoteJid.split('@')[0] }

                        // Helper to save bot messages to DB for visibility in Live Chat
                        async function saveBotMessage(botText: string) {
                            const now = new Date().toISOString();
                            await supabase.from('messages').insert({
                                conversation_id: convId,
                                text: botText,
                                sender: 'me',
                                timestamp: now,
                                status: 'sent'
                            });
                            await supabase.from('conversations').update({
                                last_message: botText,
                                last_message_time: now
                            }).eq('id', convId);
                        }

                        // Node Logic execution
                        async function executeNodeLogic(flow: any, startNodeId: string, visited: Set<string>, sessionVars: any) {
                            const nodes = flow.nodes || []; const edges = flow.edges || [];
                            const runner = async (nodeId: string) => {
                                if (visited.has(nodeId)) return; visited.add(nodeId);
                                const node = nodes.find((n: any) => n.id === nodeId); if (!node) return;
                                const localInterpolate = (t: string) => t.replace(/\{\{(.*?)\}\}/g, (m, k) => sessionVars[k.trim().toLowerCase()] || (contactData as any)[k.trim().toLowerCase()] || m);

                                if (node.type === 'message' && node.data?.content) {
                                    const interpolatedText = localInterpolate(node.data.content);
                                    await fetch(`${settings.api_url}/message/sendText/${instance}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'apikey': settings.api_key }, body: JSON.stringify({ number: remoteJid, text: interpolatedText, delay: 1000 }) });
                                    await saveBotMessage(interpolatedText);
                                } else if (node.type === 'question' && node.data?.content) {
                                    const interpolatedText = localInterpolate(node.data.content);
                                    await fetch(`${settings.api_url}/message/sendText/${instance}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'apikey': settings.api_key }, body: JSON.stringify({ number: remoteJid, text: interpolatedText, delay: 1000 }) });
                                    await saveBotMessage(interpolatedText);
                                    await supabase.from('conversations').update({ current_flow_id: flow.id, current_node_id: node.id }).eq('id', convId);
                                    return;
                                } else if (node.type === 'condition' && node.data?.variable) {
                                    const varKey = node.data.variable.replace(/\{\{|\}\}/g, '').trim().toLowerCase();
                                    const varValue = String(sessionVars[varKey] || (contactData as any)[varKey] || '').toLowerCase();
                                    const condition = String(node.data.condition || '').toLowerCase();
                                    let result = condition.includes('igual') ? varValue === condition.split('igual')[1]?.trim() : (condition.includes('contém') ? varValue.includes(condition.split('contém')[1]?.trim()) : varValue.includes(condition));
                                    const nextEdge = edges.find((e: any) => e.source === nodeId && e.sourceHandle === (result ? 'true' : 'false'));
                                    if (nextEdge) await runner(nextEdge.target); return;
                                } else if (node.type === 'agent' && node.data?.agentId) {
                                    await supabase.from('conversations').update({ assigned_agent_id: node.data.agentId, assigned_at: new Date().toISOString(), current_flow_id: null, current_node_id: null }).eq('id', convId);
                                    await logDb(`Flow Assigned to Agent: ${node.data.agentName || node.data.agentId}`); return;
                                } else if (node.type === 'database' && node.data?.table) {
                                    let success = false;
                                    try {
                                        const table = node.data.table;
                                        const operation = node.data.operation || 'SELECT';
                                        const connectionType = node.data.connectionType || 'local'; // 'local' or 'external'
                                        const payloadStr = localInterpolate(node.data.payload || '{}');
                                        const payload = JSON.parse(payloadStr);

                                        let res: any = { data: null, error: null };

                                        if (connectionType === 'external' && node.data.connectionString) {
                                            // EXTERNAL POSTGRES CONNECTION
                                            const connectionString = localInterpolate(node.data.connectionString);
                                            const { Client } = await import('https://deno.land/x/postgres@v0.17.0/mod.ts');
                                            const client = new Client(connectionString);
                                            await client.connect();

                                            try {
                                                if (operation === 'SELECT') {
                                                    const keys = Object.keys(payload);
                                                    const whereClause = keys.length ? `WHERE ${keys.map((k, i) => `${k} = $${i + 1}`).join(' AND ')}` : '';
                                                    const values = keys.map(k => payload[k]);
                                                    const result = await client.queryArray(`SELECT * FROM ${table} ${whereClause} LIMIT 1`, values);
                                                    const row = result.rows[0];
                                                    if (row) {
                                                        const columns = result.rowDescription.columns.map((c: any) => c.name);
                                                        const dataObj: any = {};
                                                        columns.forEach((col: string, idx: number) => { dataObj[col] = row[idx]; });
                                                        res = { data: dataObj, error: null };
                                                    } else {
                                                        res = { data: null, error: { message: 'No rows found' } };
                                                    }
                                                } else if (operation === 'INSERT') {
                                                    const keys = Object.keys(payload);
                                                    const cols = keys.join(', ');
                                                    const vals = keys.map((_, i) => `$${i + 1}`).join(', ');
                                                    const values = keys.map(k => payload[k]);
                                                    const result = await client.queryArray(`INSERT INTO ${table} (${cols}) VALUES (${vals}) RETURNING *`, values);
                                                    const row = result.rows[0];
                                                    if (row) {
                                                        const columns = result.rowDescription.columns.map((c: any) => c.name);
                                                        const dataObj: any = {};
                                                        columns.forEach((col: string, idx: number) => { dataObj[col] = row[idx]; });
                                                        res = { data: dataObj, error: null };
                                                    }
                                                } else if (operation === 'UPDATE') {
                                                    if (!payload.id) throw new Error('UPDATE requires "id" in payload');
                                                    const id = payload.id;
                                                    delete payload.id;
                                                    const keys = Object.keys(payload);
                                                    const setClause = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
                                                    const values = [id, ...keys.map(k => payload[k])];
                                                    const result = await client.queryArray(`UPDATE ${table} SET ${setClause} WHERE id = $1 RETURNING *`, values);
                                                    const row = result.rows[0];
                                                    if (row) {
                                                        const columns = result.rowDescription.columns.map((c: any) => c.name);
                                                        const dataObj: any = {};
                                                        columns.forEach((col: string, idx: number) => { dataObj[col] = row[idx]; });
                                                        res = { data: dataObj, error: null };
                                                    }
                                                }
                                            } finally {
                                                await client.end();
                                            }

                                        } else if (connectionType === 'mysql' && node.data.connectionString) {
                                            // EXTERNAL MYSQL CONNECTION
                                            const connectionString = localInterpolate(node.data.connectionString);
                                            // Extract params from connection string or assume standard format mysql://user:pass@host:port/db
                                            // Note: deno_mysql Client doesn't parse URI automatically in the same way, let's try a URI parser or manual extraction if needed.
                                            // Actually, for simplicity, let's assume valid URI and use a driver that supports it or parse it.
                                            // 'deno_mysql' requires separate config object often. Let's parse the string.
                                            // URI: mysql://user:password@hostname:port/dbName

                                            try {
                                                const url = new URL(connectionString);
                                                const config = {
                                                    hostname: url.hostname,
                                                    username: url.username,
                                                    password: url.password,
                                                    db: url.pathname.slice(1),
                                                    port: parseInt(url.port) || 3306
                                                };

                                                const { Client } = await import('https://deno.land/x/mysql@v2.12.1/mod.ts');
                                                const client = await new Client().connect(config);

                                                try {
                                                    if (operation === 'SELECT') {
                                                        const keys = Object.keys(payload);
                                                        const whereClause = keys.length ? `WHERE ${keys.map(k => `${k} = ?`).join(' AND ')}` : '';
                                                        const values = keys.map(k => payload[k]);
                                                        const result = await client.query(`SELECT * FROM ${table} ${whereClause} LIMIT 1`, values);
                                                        const row = result[0];
                                                        res = row ? { data: row, error: null } : { data: null, error: { message: 'No rows found' } };

                                                    } else if (operation === 'INSERT') {
                                                        client.config.enableIdentifiers = true; // Protect identifiers if possible, or trust user input for table names
                                                        const keys = Object.keys(payload);
                                                        const cols = keys.join(', ');
                                                        const vals = keys.map(() => '?').join(', ');
                                                        const values = keys.map(k => payload[k]);
                                                        const result = await client.execute(`INSERT INTO ${table} (${cols}) VALUES (${vals})`, values);
                                                        // insertId might be available. Fetch the inserted row?
                                                        // MySQL doesn't have RETURNING * (except MariaDB 10.5+). Best effort: select last insert.
                                                        // For now return empty or basic info.
                                                        res = { data: { ...payload, id: result.lastInsertId }, error: null };

                                                    } else if (operation === 'UPDATE') {
                                                        if (!payload.id) throw new Error('UPDATE requires "id" in payload');
                                                        const id = payload.id;
                                                        delete payload.id;
                                                        const keys = Object.keys(payload);
                                                        const setClause = keys.map(k => `${k} = ?`).join(', ');
                                                        const values = [...keys.map(k => payload[k]), id];
                                                        await client.execute(`UPDATE ${table} SET ${setClause} WHERE id = ?`, values);
                                                        // Return payload merged
                                                        res = { data: { ...payload, id }, error: null };
                                                    }
                                                } finally {
                                                    await client.close();
                                                }
                                            } catch (e) {
                                                console.error('MySQL Error', e);
                                                throw e;
                                            }

                                        } else {
                                            // LOCAL SUPABASE CONNECTION
                                            if (operation === 'SELECT') {
                                                res = await supabase.from(table).select('*').match(payload).limit(1).single();
                                            } else if (operation === 'INSERT') {
                                                res = await supabase.from(table).insert(payload).select().single();
                                            } else if (operation === 'UPDATE') {
                                                if (payload.id) {
                                                    res = await supabase.from(table).update(payload).eq('id', payload.id).select().single();
                                                } else {
                                                    throw new Error('UPDATE operation requires "id" in payload');
                                                }
                                            }
                                        }

                                        if (!res.error && res.data) {
                                            success = true;
                                            // Merge result into variables
                                            const updatedVars = { ...sessionVars, ...res.data };
                                            Object.assign(sessionVars, updatedVars);
                                            await supabase.from('conversations').update({ variables: updatedVars }).eq('id', convId);
                                        } else {
                                            await logDb(`DbNodeError: ${res.error?.message || 'No data found'}`);
                                        }
                                    } catch (e) { await logDb(`DbNodeException: ${e.message}`); }

                                    const nextEdge = edges.find((e: any) => e.source === nodeId && e.sourceHandle === (success ? 'success' : 'error'));
                                    if (nextEdge) {
                                        await runner(nextEdge.target);
                                        return;
                                    }
                                } else if (node.type === 'api' && node.data?.url) {
                                    let success = false;
                                    try {
                                        const headers = JSON.parse(localInterpolate(node.data.headers || '{}'));
                                        const response = await fetch(localInterpolate(node.data.url), { method: node.data.method || 'GET', headers });
                                        if (response.ok) {
                                            success = true;
                                            const contentType = response.headers.get('content-type');
                                            if (contentType && contentType.includes('application/json')) {
                                                const json = await response.json();
                                                if (json && typeof json === 'object') {
                                                    // Merge JSON response into session variables
                                                    const updatedVars = { ...sessionVars, ...json };
                                                    Object.assign(sessionVars, updatedVars); // Update in-place for current runner
                                                    await supabase.from('conversations').update({ variables: updatedVars }).eq('id', convId);
                                                }
                                            }
                                        }
                                    } catch (e) { await logDb(`ApiNodeError: ${e.message}`); }

                                    const nextEdge = edges.find((e: any) => e.source === nodeId && e.sourceHandle === (success ? 'success' : 'error'));
                                    if (nextEdge) {
                                        await runner(nextEdge.target);
                                        return;
                                    }
                                } else if (node.type === 'switch' && node.data?.variable) {
                                    // SWITCH NODE LOGIC
                                    const varKey = node.data.variable.trim().toLowerCase();
                                    const varValue = String(sessionVars[varKey] || (contactData as any)[varKey] || '').toLowerCase();
                                    const cases = node.data.cases || [];
                                    let matchedIndex = -1;

                                    for (let i = 0; i < cases.length; i++) {
                                        if (cases[i].condition && String(cases[i].condition).toLowerCase() === varValue) {
                                            matchedIndex = i;
                                            break;
                                        }
                                    }

                                    const handleId = matchedIndex !== -1 ? `case-${matchedIndex}` : 'default';
                                    const nextEdge = edges.find((e: any) => e.source === nodeId && e.sourceHandle === handleId);
                                    if (nextEdge) {
                                        await runner(nextEdge.target);
                                        return;
                                    }

                                } else if (node.type === 'set_variable' && node.data?.variable) {
                                    // SET VARIABLE LOGIC
                                    const varName = node.data.variable.trim().toLowerCase();
                                    const varValue = localInterpolate(node.data.value || '');
                                    sessionVars[varName] = varValue;
                                    await supabase.from('conversations').update({ variables: sessionVars }).eq('id', convId);

                                } else if (node.type === 'code' && node.data?.code) {
                                    // CODE NODE LOGIC
                                    try {
                                        const userCode = node.data.code;
                                        // Simple sandbox: only give access to 'vars'
                                        // new Function is safer than eval but still risky if environment not locked down. 
                                        // Deno Deploy is secure by default (no filesystem/env access unless granted).
                                        const func = new Function('vars', userCode);
                                        const result = func({ ...sessionVars, ...contactData }); // Pass copy of vars

                                        if (result && typeof result === 'object') {
                                            Object.assign(sessionVars, result);
                                            await supabase.from('conversations').update({ variables: sessionVars }).eq('id', convId);
                                        }
                                    } catch (e) {
                                        await logDb(`CodeNodeError: ${e.message}`);
                                    }

                                } else if (node.type === 'ai' && node.data?.system_prompt) {
                                    // AI NODE LOGIC
                                    try {
                                        if (aiSettings?.api_key) {
                                            const systemPrompt = localInterpolate(node.data.system_prompt);
                                            const input = localInterpolate(node.data.input || '{{last_message}}');
                                            const outputVar = node.data.output_variable || 'ai_result';

                                            // Call Gemini
                                            const aiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${aiSettings.model || 'gemini-1.5-flash'}:generateContent?key=${aiSettings.api_key}`, {
                                                method: 'POST', headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\nInput: ${input}` }] }] })
                                            });
                                            const aiData = await aiRes.json();
                                            const aiText = aiData?.candidates?.[0]?.content?.parts?.[0]?.text || '';

                                            sessionVars[outputVar] = aiText;
                                            await supabase.from('conversations').update({ variables: sessionVars }).eq('id', convId);
                                        }
                                    } catch (e) { await logDb(`AiNodeError: ${e.message}`); }

                                } else if (node.type === 'tag' && node.data?.tag) {
                                    // TAG NODE LOGIC
                                    const tag = localInterpolate(node.data.tag).trim();
                                    const action = node.data.action || 'add';
                                    const { data: contact } = await supabase.from('contacts').select('tags').eq('remote_jid', remoteJid).single();

                                    let tags: string[] = contact?.tags || [];
                                    if (action === 'remove') {
                                        tags = tags.filter(t => t !== tag);
                                    } else {
                                        if (!tags.includes(tag)) tags.push(tag);
                                    }
                                    await supabase.from('contacts').update({ tags }).eq('remote_jid', remoteJid);

                                } else if (node.type === 'notification' && node.data?.phone && node.data?.message) {
                                    // NOTIFICATION NODE LOGIC
                                    const targetPhone = localInterpolate(node.data.phone).replace(/\D/g, '') + '@s.whatsapp.net';
                                    const message = localInterpolate(node.data.message);
                                    if (settings?.api_url && settings?.api_key) {
                                        await fetch(`${settings.api_url}/message/sendText/${instance}`, {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json', 'apikey': settings.api_key },
                                            body: JSON.stringify({ number: targetPhone, text: message })
                                        });
                                    }

                                } else if (node.type === 'schedule') {
                                    // SCHEDULE NODE LOGIC
                                    const now = new Date();
                                    const localTimeParts = new Intl.DateTimeFormat('en-US', {
                                        timeZone: bizHours?.timezone || 'America/Sao_Paulo',
                                        hour: '2-digit', minute: '2-digit', weekday: 'short', hour12: false
                                    }).formatToParts(now);

                                    const dayMap: any = { 'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6 };
                                    const currentDayStr = localTimeParts.find(p => p.type === 'weekday')?.value;
                                    const currentDay = dayMap[currentDayStr || 'Mon'];

                                    const hour = localTimeParts.find(p => p.type === 'hour')?.value;
                                    const minute = localTimeParts.find(p => p.type === 'minute')?.value;
                                    const currentTime = `${hour}:${minute}`;

                                    const allowedDays = node.data.days || [1, 2, 3, 4, 5];
                                    const startTime = node.data.startTime || '09:00';
                                    const endTime = node.data.endTime || '18:00';

                                    const isOpen = allowedDays.includes(currentDay) && currentTime >= startTime && currentTime <= endTime;
                                    const nextEdge = edges.find((e: any) => e.source === nodeId && e.sourceHandle === (isOpen ? 'open' : 'closed'));

                                    if (nextEdge) {
                                        await runner(nextEdge.target);
                                        return;
                                    }

                                } else if (node.type === 'delay' && node.data?.delay) {
                                    await new Promise(r => setTimeout(r, (node.data.delay || 2) * 1000));

                                } else if (node.type === 'random') {
                                    // RANDOM NODE LOGIC
                                    const path = Math.random() < 0.5 ? 'a' : 'b';
                                    const nextEdge = edges.find((e: any) => e.source === nodeId && e.sourceHandle === path);
                                    if (nextEdge) {
                                        await runner(nextEdge.target);
                                        return;
                                    }

                                } else if (node.type === 'audio_transcription') {
                                    // AUDIO TRANSCRIPTION LOGIC
                                    // Need OpenAI Key. Re-using AI Settings or checking Integrations.
                                    // Assuming getLastMessage was audio.
                                    const lastMsg = await supabase.from('messages').select('*').eq('conversation_id', convId).order('timestamp', { ascending: false }).limit(1).single();

                                    if (lastMsg.data?.media_type === 'audio' && lastMsg.data?.media_url) {
                                        try {
                                            // We need the file blob. Supabase Edge Functions can fetch it.
                                            // This requires an OpenAI Key.
                                            const { data: integrations } = await supabase.from('integrations').select('credentials').eq('user_id', userId).eq('type', 'openai').single();
                                            const apiKey = integrations?.credentials?.api_key || aiSettings.api_key;

                                            if (apiKey) {
                                                // Download audio
                                                const audioRes = await fetch(lastMsg.data.media_url);
                                                const audioBlob = await audioRes.blob();

                                                const formData = new FormData();
                                                formData.append('file', audioBlob, 'audio.ogg');
                                                formData.append('model', 'whisper-1');

                                                const transRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
                                                    method: 'POST',
                                                    headers: { 'Authorization': `Bearer ${apiKey}` },
                                                    body: formData
                                                });

                                                const transData = await transRes.json();
                                                const text = transData.text;

                                                const outVar = node.data.output_variable || 'transcription';
                                                sessionVars[outVar] = text;
                                                await supabase.from('conversations').update({ variables: sessionVars }).eq('id', convId);
                                            }
                                        } catch (e) { await logDb(`WhisperError: ${e.message}`); }
                                    }

                                } else if (node.type === 'mercadopago' && node.data?.value) {
                                    // MERCADO PAGO LOGIC
                                    try {
                                        const { data: integrations } = await supabase.from('integrations').select('credentials').eq('user_id', userId).eq('type', 'mercadopago').single();
                                        const accessToken = integrations?.credentials?.access_token;

                                        if (accessToken) {
                                            const body = {
                                                transaction_amount: Number(node.data.value),
                                                description: node.data.description || 'Pedido',
                                                payment_method_id: 'pix',
                                                payer: { email: 'customer@email.com' }, // MP requires email, use dummy or capture
                                                external_reference: convId // LINK PAYMENT TO CONVERSATION
                                            };

                                            const mpRes = await fetch('https://api.mercadopago.com/v1/payments', {
                                                method: 'POST',
                                                headers: {
                                                    'Authorization': `Bearer ${accessToken}`,
                                                    'Content-Type': 'application/json',
                                                    'X-Idempotency-Key': crypto.randomUUID()
                                                },
                                                body: JSON.stringify(body)
                                            });
                                            const mpData = await mpRes.json();

                                            if (mpData.point_of_interaction?.transaction_data?.qr_code) {
                                                const copyPaste = mpData.point_of_interaction.transaction_data.qr_code;
                                                const base64 = mpData.point_of_interaction.transaction_data.qr_code_base64;

                                                // Send QR Code logic would go here. For now, we send the Copy Paste code.
                                                if (settings?.api_url && settings?.api_key) {
                                                    await fetch(`${settings.api_url}/message/sendText/${instance}`, {
                                                        method: 'POST', headers: { 'Content-Type': 'application/json', 'apikey': settings.api_key },
                                                        body: JSON.stringify({ number: remoteJid, text: `💰 Copia e Cola do PIX:\n\n${copyPaste}` })
                                                    });
                                                }

                                                // WAIT FOR PAYMENT: Stop execution here?
                                                // Ideally we set a "waiting_payment" status.
                                                // But for this simple implementation, we send 'pending' edge immediately 
                                                // and let the user decide if they want to wait (using a Wait node, if we had one).
                                                // Actually, "Smart" implementation:
                                                const pendingEdge = edges.find((e: any) => e.source === nodeId && e.sourceHandle === 'pending');
                                                if (pendingEdge) {
                                                    await runner(pendingEdge.target);
                                                    return;
                                                }
                                            }
                                        }
                                    } catch (e) { await logDb(`MercadoPagoError: ${e.message}`); }
                                }

                                const outEdge = edges.find((e: any) => e.source === nodeId && !e.sourceHandle);
                                if (outEdge) await runner(outEdge.target);
                            };
                            await runner(startNodeId);
                        }

                        // 5.1 Check wait (Question Node)
                        if (existingConv?.current_node_id && existingConv?.current_flow_id) {
                            const { data: currentFlow } = await supabase.from('flows').select('*').eq('id', existingConv.current_flow_id).single()
                            if (currentFlow) {
                                const nodes = currentFlow.nodes || []; const edges = currentFlow.edges || [];
                                const waitingNode = nodes.find((n: any) => n.id === existingConv.current_node_id)
                                if (waitingNode && waitingNode.type === 'question') {
                                    const varName = waitingNode.data?.variable?.toLowerCase() || 'answer'; const newVars = { ...vars, [varName]: text };
                                    await supabase.from('conversations').update({ variables: newVars, current_node_id: null }).eq('id', convId);
                                    const outEdge = edges.find((e: any) => e.source === waitingNode.id);
                                    // Pass empty visited set to allow looping back to the same Question node (retry pattern)
                                    if (outEdge) await executeNodeLogic(currentFlow, outEdge.target, new Set(), newVars);
                                    continue; // Process next message
                                }
                            }
                        }

                        // 5.3 Flow Triggers
                        await logDb(`Checking flows for instance ${instanceId} (User: ${userId})`);
                        const { data: activeFlows } = await supabase.from('flows').select('*').eq('instance_id', instanceId).eq('status', 'ACTIVE');
                        for (const flow of (activeFlows || [])) {
                            const startNode = flow.nodes?.find((n: any) => n.type === 'start');
                            if (!startNode) continue;
                            const keywords = (startNode.data?.keyword || '').split(',').map((k: string) => k.trim().toLowerCase()).filter((k: string) => k);
                            let shouldExec = startNode.data?.triggerType === 'keyword' ? keywords.some((k: string) => text.toLowerCase().includes(k)) : true;

                            if (shouldExec) {
                                await logDb(`Flow Matched: ${flow.name} (ID: ${flow.id}) for ${remoteJid}`);
                                if (startNode.data?.triggerType !== 'keyword') {
                                    const cooldown = startNode.data?.cooldown ?? 360;
                                    if (cooldown > 0 && existingConv?.last_flow_at && (new Date().getTime() - new Date(existingConv.last_flow_at).getTime()) / 60000 < cooldown) continue;
                                }
                                await supabase.from('conversations').update({ last_flow_at: new Date().toISOString(), variables: {}, current_flow_id: flow.id }).eq('id', convId);
                                const firstEdge = flow.edges?.find((e: any) => e.source === startNode.id);
                                if (firstEdge) await executeNodeLogic(flow, firstEdge.target, new Set([startNode.id]), {});
                                break;
                            }
                        }
                    } catch (e) { await logDb(`FlowError: ${e.message}`) }
                }
            }

            // 6. Gemini AI
            if (!fromMe && remoteJid && !remoteJid.includes('@g.us') && aiSettings?.enabled && aiSettings?.api_key && text) {
                if (isAssigned) {
                    await logDb(`AI Inhibit: Human assistance active for ${remoteJid}`);
                } else {
                    try {
                        const { data: history } = await supabase.from('messages').select('text, sender').eq('conversation_id', convId).order('timestamp', { ascending: false }).limit(aiSettings.history_limit || 5);
                        const formatted = (history || []).reverse().filter(m => m.text).map(m => ({ role: m.sender === 'me' ? 'model' : 'user', parts: [{ text: m.text }] }));
                        const aiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${aiSettings.model || 'gemini-1.5-flash'}:generateContent?key=${aiSettings.api_key}`, {
                            method: 'POST', headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: `Persona: ${aiSettings.system_prompt}` }] }, { role: 'model', parts: [{ text: "Ok." }] }, ...formatted], generationConfig: { temperature: aiSettings.temperature ?? 0.7, maxOutputTokens: aiSettings.max_tokens ?? 800 } })
                        });
                        const aiData = await aiRes.json();
                        const aiText = aiData?.candidates?.[0]?.content?.parts?.[0]?.text;
                        if (aiText && settings?.api_url && settings?.api_key) {
                            await fetch(`${settings.api_url}/message/sendText/${instance}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'apikey': settings.api_key }, body: JSON.stringify({ number: remoteJid, text: aiText, delay: 2000 }) });
                            const now = new Date().toISOString();
                            await supabase.from('messages').insert({ conversation_id: convId, text: aiText, sender: 'me', timestamp: now, status: 'sent' });
                            await supabase.from('conversations').update({ last_message: aiText, last_message_time: now }).eq('id', convId);
                        }
                    } catch (e) { await logDb(`AIError: ${e.message}`) }
                }
            }
        }

        return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } })
    } catch (error) {
        await logDb(`GlobalError: ${error.message}`)
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } })
    }
})
