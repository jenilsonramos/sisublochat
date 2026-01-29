import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import pool from './db.js';
import cron from 'node-cron'; // Import node-cron

dotenv.config();

// --- INTERNAL CRON SCHEDULER ---
const SUPABASE_URL = process.env.SUPABASE_URL;
const CRON_SECRET = process.env.CRON_SECRET;

const triggerCron = async (action) => {
    if (!SUPABASE_URL || !CRON_SECRET) {
        console.error("❌ Cron Failed: Missing SUPABASE_URL or CRON_SECRET in .env");
        return;
    }
    console.log(`⏳ Triggering Internal Cron: ${action}...`);
    try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/billing-cron`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${CRON_SECRET}`
            },
            body: JSON.stringify({ trigger_action: action })
        });
        const data = await res.json();
        console.log(`✅ Cron Result (${action}):`, data);
    } catch (error) {
        console.error(`❌ Cron Error (${action}):`, error.message);
    }
};

// 1. Verificação Diária (00:00)
cron.schedule('0 0 * * *', () => {
    console.log('🕛 Executing Midnight Job: DAILY_CHECK');
    triggerCron('DAILY_CHECK');
}, {
    timezone: "America/Sao_Paulo"
});

// 2. Notificação (09:00)
cron.schedule('0 9 * * *', () => {
    console.log('🕘 Executing Morning Job: DAILY_EMAIL');
    triggerCron('DAILY_EMAIL');
}, {
    timezone: "America/Sao_Paulo"
});

// 3. Campaign Processor (Every 60s)
cron.schedule('* * * * *', async () => {
    console.log('🔄 Executing Campaign Processor (Every 60s)');
    await processCampaigns();
}, { timezone: "America/Sao_Paulo" });

console.log('🚀 Internal Cron Scheduler Started (Timezone: America/Sao_Paulo)');

// Helper: Delay
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper: Send Chat Presence (Typing)
async function sendChatPresence(instanceName, remoteJid, status) {
    const apiUrl = process.env.EVOLUTION_API_URL;
    const apiKey = process.env.EVOLUTION_API_KEY;
    if (!apiUrl || !apiKey) return;
    try {
        // We Use the JID directly
        await fetch(`${apiUrl}/chat/presenceUpdate/${instanceName}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': apiKey },
            body: JSON.stringify({
                number: remoteJid,
                presence: status // 'composing', 'recording', 'paused'
            })
        });
    } catch (e) {
        console.error('❌ Presence Error:', e.message);
    }
}

// Helper: Mark Message as Read
async function markMessageAsRead(instanceName, remoteJid) {
    const apiUrl = process.env.EVOLUTION_API_URL;
    const apiKey = process.env.EVOLUTION_API_KEY;
    if (!apiUrl || !apiKey) return;
    try {
        await fetch(`${apiUrl}/chat/markMessageAsRead/${instanceName}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': apiKey },
            body: JSON.stringify({ number: remoteJid })
        });
    } catch (e) {
        console.error('❌ Read Status Error:', e.message);
    }
}

// Helper: Send Message via Evolution API
async function sendEvolutionMessage(instanceName, remoteJid, text, apiKey, apiUrl) {
    if (!apiKey || !apiUrl) return false;
    try {
        const url = `${apiUrl}/message/sendText/${instanceName}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': apiKey
            },
            body: JSON.stringify({
                number: remoteJid,
                text: text
            })
        });
        const data = await response.json();
        return response.ok; // data.sent or similar
    } catch (e) {
        console.error('Evolution API Error:', e.message);
        return false;
    }
}

// Logic: Process Campaigns
async function processCampaigns() {
    try {
        // 0. Ensure Tables Exist (Safety Check)
        await pool.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');
        await pool.query(`CREATE TABLE IF NOT EXISTS public.instances (
            id uuid NOT NULL DEFAULT gen_random_uuid(),
            name text UNIQUE NOT NULL,
            status text DEFAULT 'connecting',
            created_at timestamp with time zone DEFAULT now(),
            CONSTRAINT instances_pkey PRIMARY KEY (id)
        )`);
        await pool.query(`CREATE TABLE IF NOT EXISTS public.campaigns (
            id uuid NOT NULL DEFAULT gen_random_uuid(),
            user_id uuid,
            instance_id uuid,
            name text NOT NULL,
            message_template text,
            min_delay integer DEFAULT 15,
            max_delay integer DEFAULT 45,
            total_messages integer DEFAULT 0,
            sent_messages integer DEFAULT 0,
            error_messages integer DEFAULT 0,
            status text DEFAULT 'PENDING',
            scheduled_at timestamp with time zone,
            created_at timestamp with time zone DEFAULT now(),
            updated_at timestamp with time zone DEFAULT now(),
            CONSTRAINT campaigns_pkey PRIMARY KEY (id),
            CONSTRAINT campaigns_instance_id_fkey FOREIGN KEY (instance_id) REFERENCES public.instances(id)
        )`);
        await pool.query(`CREATE TABLE IF NOT EXISTS public.campaign_messages (
            id uuid NOT NULL DEFAULT gen_random_uuid(),
            campaign_id uuid NOT NULL,
            remote_jid text NOT NULL,
            variables jsonb DEFAULT '{}'::jsonb,
            status text DEFAULT 'PENDING',
            sent_at timestamp with time zone,
            error_message text,
            created_at timestamp with time zone DEFAULT now(),
            CONSTRAINT campaign_messages_pkey PRIMARY KEY (id),
            CONSTRAINT campaign_messages_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE
        )`);

        // 1. Activate Scheduled Campaigns
        await pool.query(`
            UPDATE public.campaigns 
            SET status = 'PROCESSING' 
            WHERE status = 'PENDING' 
            AND scheduled_at IS NOT NULL 
            AND scheduled_at <= NOW()
        `);

        // 2. Fetch Active Campaigns
        const [campaigns] = await pool.query(`
            SELECT c.*, i.name as instance_name 
            FROM public.campaigns c 
            JOIN public.instances i ON c.instance_id = i.id 
            WHERE c.status = 'PROCESSING'
        `);

        if (campaigns.length === 0) return;

        // 3. Get System Settings (API Key/URL)
        const [settings] = await pool.query('SELECT api_url, api_key FROM system_settings LIMIT 1');
        const config = settings[0];
        if (!config || !config.api_url || !config.api_key) {
            console.log('⚠️ Campaign Skip: System settings (API URL/Key) not configured.');
            return;
        }

        // 4. Process each campaign
        for (const camp of campaigns) {
            // Fetch PENDING messages (Limit 5 per cycle per campaign to be safe/incremental)
            const [messages] = await pool.query(`
                SELECT * FROM campaign_messages 
                WHERE campaign_id = ? AND status = 'PENDING' 
                LIMIT 5
            `, [camp.id]);

            if (messages.length === 0) {
                // If no pending messages, mark campaign as COMPLETED
                const [remaining] = await pool.query('SELECT COUNT(*) as count FROM campaign_messages WHERE campaign_id = ? AND status = "PENDING"', [camp.id]);
                if (remaining[0].count === 0) {
                    await pool.query('UPDATE campaigns SET status = "COMPLETED" WHERE id = ?', [camp.id]);
                    console.log(`✅ Campaign Completed: ${camp.name}`);
                }
                continue;
            }

            // Send messages
            for (const msg of messages) {
                // Replace Variables
                let finalText = camp.message_template || '';
                if (msg.variables) {
                    const vars = typeof msg.variables === 'string' ? JSON.parse(msg.variables) : msg.variables;
                    Object.keys(vars).forEach(key => {
                        finalText = finalText.replace(new RegExp(`{{${key}}}`, 'g'), vars[key]);
                    });
                }

                // Send
                const success = await sendEvolutionMessage(camp.instance_name, msg.remote_jid, finalText, config.api_key, config.api_url);

                // Update Status
                if (success) {
                    await pool.query('UPDATE campaign_messages SET status = "SENT", sent_at = NOW() WHERE id = ?', [msg.id]);
                    await pool.query('UPDATE campaigns SET sent_messages = sent_messages + 1, updated_at = NOW() WHERE id = ?', [camp.id]);
                    console.log(`-> Sent to ${msg.remote_jid} (Camp: ${camp.name})`);
                } else {
                    await pool.query('UPDATE campaign_messages SET status = "ERROR", error_message = "Failed to send", sent_at = NOW() WHERE id = ?', [msg.id]);
                    await pool.query('UPDATE campaigns SET error_messages = error_messages + 1, updated_at = NOW() WHERE id = ?', [camp.id]);
                    console.log(`-> Failed to ${msg.remote_jid} (Camp: ${camp.name})`);
                }

                // Random Delay (Simple sleep)
                const delay = Math.floor(Math.random() * (camp.max_delay - camp.min_delay + 1) + camp.min_delay) * 1000;
                await new Promise(r => setTimeout(r, 1000)); // Minimal 1s wait here, relying on 60s cron loop for pacing
            }
        }

    } catch (e) {
        console.error('❌ Campaign Processor Error:', e);
    }
}

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// DEBUG: Log all requests
app.use((req, res, next) => {
    console.log(`[REQUEST] ${req.method} ${req.path}`);
    next();
});

// Logic: Process Chatbot
async function processChatbot(instanceId, userId, remoteJid, text, instanceName) {
    if (!text) return;

    try {
        console.log(`🤖 Checking chatbot for: "${text}" (Instance: ${instanceName})`);

        // 1. Find active chatbot with matching trigger (case insensitive)
        const [chatbots] = await pool.query(
            `SELECT id FROM chatbots 
             WHERE (instance_id = ? OR instance_id IS NULL) 
             AND user_id = ? 
             AND status = 'ACTIVE' 
             AND (
                LOWER("trigger") = LOWER(?) 
                OR (LOWER(match_type) = 'contains' AND LOWER(?) LIKE '%' || LOWER("trigger") || '%')
             )
             ORDER BY instance_id NULLS LAST LIMIT 1`,
            [instanceId, userId, text.trim(), text.trim()]
        );

        if (chatbots.length === 0) {
            console.log('❌ No matching chatbot found for:', text.trim());
            return;
        }

        const chatbotId = chatbots[0].id;
        console.log(`🎯 Chatbot Match found: ${chatbotId}`);

        // 0. Mark message as read immediately
        await markMessageAsRead(instanceName, remoteJid);

        // 2. Get steps ordered by "order" column
        const [steps] = await pool.query(
            'SELECT * FROM chatbot_steps WHERE chatbot_id = ? ORDER BY "order" ASC',
            [chatbotId]
        );

        if (steps.length === 0) return;

        // 3. Send response
        for (const step of steps) {
            console.log('🤖 Processing Step:', JSON.stringify(step));
            // Apply Delay and Typing Simulation
            if (step.delay && step.delay > 0) {
                if (step.simulate_typing) {
                    console.log(`✍️ Simulating typing for ${step.delay}s...`);
                    await sendChatPresence(instanceName, remoteJid, 'composing');
                }
                await sleep(step.delay * 1000);
            }

            if (step.type === 'text' && step.content) {
                console.log(`📤 Sending chatbot response to ${remoteJid}`);
                await sendEvolutionMessage(
                    instanceName,
                    remoteJid,
                    step.content,
                    process.env.EVOLUTION_API_KEY,
                    process.env.EVOLUTION_API_URL
                );
            }
            // Add other media types as needed
        }
    } catch (e) {
        console.error('❌ Chatbot Error:', e.message);
    }
}

// --- WEBHOOK HANDLER (MOVED TO TOP PRIORITY) ---
app.use('/webhook/evolution', async (req, res) => {
    console.log('🔹 [EARLY HANDLER] Hit:', req.path);
    try {
        const payload = req.body;
        const eventType = payload.type || payload.event;
        const data = payload.data;

        console.log('🔹 Webhook Payload:', eventType, 'Instance:', payload.instance);

        if (!data) {
            console.log('⚠️ Webhook Skip: No data in payload');
            return res.json({ received: true });
        }

        // 1. CONNECTION UPDATE
        if (['connection.update', 'CONNECTION_UPDATE'].includes(eventType)) {
            const state = data.state || 'unknown';
            const instanceName = payload.instance;
            const ownerJid = data.ownerJid || data.wuid || payload.sender || null;
            await pool.query('UPDATE instances SET status = ?, owner_jid = ? WHERE name = ?', [state, ownerJid, instanceName]);
            return res.json({ received: true });
        }

        // 2. MESSAGES UPSERT
        if (['MESSAGES_UPSERT', 'messages.upsert'].includes(eventType)) {
            const messages = data.messages || (data.key ? [data] : []);
            if (!messages.length) return res.json({ received: true });

            const instanceName = payload.instance;
            const [instRows] = await pool.query('SELECT id, user_id FROM instances WHERE name = ?', [instanceName]);
            if (instRows.length === 0) {
                console.log(`⚠️ Webhook Skip: Instance '${instanceName}' not found in database`);
                return res.json({ received: true });
            }

            const instanceId = instRows[0].id;
            const userId = instRows[0].user_id;

            for (const msg of messages) {
                if (!msg.key || !msg.message) continue;

                const remoteJid = msg.key.remoteJid;
                const fromMe = msg.key.fromMe;
                const pushName = msg.pushName || (fromMe ? 'Me' : remoteJid.split('@')[0]);
                const timestamp = new Date((msg.messageTimestamp || Date.now() / 1000) * 1000).toISOString();
                const m = msg.message;

                let text = '';
                let mediaType = null;
                let mediaUrl = null;

                if (m.conversation) { text = m.conversation; }
                else if (m.extendedTextMessage) { text = m.extendedTextMessage.text; }
                else if (m.imageMessage) { text = m.imageMessage.caption || ''; mediaType = 'image'; mediaUrl = m.imageMessage.url; }
                else if (m.videoMessage) { text = m.videoMessage.caption || ''; mediaType = 'video'; mediaUrl = m.videoMessage.url; }
                else if (m.audioMessage) { mediaType = 'audio'; mediaUrl = m.audioMessage.url; }
                else if (m.stickerMessage) { text = '[Sticker]'; mediaType = 'image'; mediaUrl = m.stickerMessage.url; }
                else { text = '[Midia/Outros]'; }

                // Upsert Contact (Robust)
                try {
                    const isPostgres = (process.env.DB_TYPE === 'postgres');
                    if (isPostgres) {
                        await pool.query(
                            `INSERT INTO contacts (id, user_id, name, remote_jid) VALUES ($1, $2, $3, $4) 
                             ON CONFLICT (remote_jid) DO UPDATE SET name = EXCLUDED.name`,
                            [uuidv4(), userId, pushName, remoteJid]
                        );
                    } else {
                        await pool.query(
                            'INSERT INTO contacts (id, user_id, name, remote_jid) VALUES (?, ?, ?, ?) ON CONFLICT(remote_jid) DO UPDATE SET name = excluded.name',
                            [uuidv4(), userId, pushName, remoteJid]
                        );
                    }
                } catch (e) {
                    console.error('Contact Upsert Error:', e.message);
                }

                // Upsert Conversation
                let convId;
                const [convRows] = await pool.query('SELECT id FROM conversations WHERE remote_jid = ? AND instance_id = ?', [remoteJid, instanceId]);
                if (convRows.length > 0) {
                    convId = convRows[0].id;
                    await pool.query('UPDATE conversations SET last_message = ?, last_message_time = ?, unread_count = unread_count + ? WHERE id = ?', [text || `[${mediaType}]`, timestamp, (fromMe ? 0 : 1), convId]);
                } else {
                    convId = uuidv4();
                    await pool.query('INSERT INTO conversations (id, user_id, instance_id, remote_jid, contact_name, last_message, last_message_time, unread_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [convId, userId, instanceId, remoteJid, pushName, text || `[${mediaType}]`, timestamp, (fromMe ? 0 : 1)]);
                }

                // Insert Message
                await pool.query('INSERT INTO messages (id, conversation_id, text, sender, status, media_url, media_type, wamid, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [uuidv4(), convId, text, fromMe ? 'me' : 'contact', 'sent', mediaUrl, mediaType, msg.key.id, timestamp]);

                // 4. CHATBOT TRIGGER (Only if not from me)
                if (!fromMe && text) {
                    processChatbot(instanceId, userId, remoteJid, text, instanceName);
                }
            }
        }
        res.json({ received: true });
    } catch (e) {
        console.error('Webhook Error:', e);
        res.status(500).json({ error: e.message });
    }
});

// --- Middlewares ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: 'Token não fornecido' });

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Token inválido' });
        req.user = user;
        next();
    });
};

// --- Rota de Teste ---
app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'Servidor rodando' });
});

// --- Rotas de Autenticação ---

// Registro
app.post('/auth/register', async (req, res) => {
    const { email, password, full_name } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    try {
        // Verificar se o email já existe
        const [existing] = await pool.query('SELECT id FROM profiles WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(400).json({ error: 'Este e-mail já está cadastrado' });
        }

        const id = uuidv4();
        const hashedPassword = await bcrypt.hash(password, 10);

        await pool.query(
            'INSERT INTO profiles (id, email, password_hash, full_name) VALUES (?, ?, ?, ?)',
            [id, email, hashedPassword, full_name || '']
        );

        const token = jwt.sign({ id, email }, process.env.JWT_SECRET, { expiresIn: '24h' });

        res.status(201).json({
            user: { id, email, full_name },
            token
        });
    } catch (error) {
        console.error('Erro no registro:', error);
        res.status(500).json({ error: 'Erro interno ao registrar usuário' });
    }
});

// Login
app.post('/auth/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    try {
        const [users] = await pool.query('SELECT * FROM profiles WHERE email = ?', [email]);
        const user = users[0];

        if (!user) {
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }

        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }

        const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '24h' });

        res.json({
            user: { id: user.id, email: user.email, full_name: user.full_name },
            token
        });
    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({ error: 'Erro interno ao realizar login' });
    }
});

// --- Rotas Protegidas ---

// INSTÂNCIAS
app.get('/instances', authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM instances WHERE user_id = ?', [req.user.id]);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/instances', authenticateToken, async (req, res) => {
    const { name, instance_id, token } = req.body;
    const id = uuidv4();
    try {
        await pool.query(
            'INSERT INTO instances (id, user_id, name, instance_id, token) VALUES (?, ?, ?, ?, ?)',
            [id, req.user.id, name, instance_id, token]
        );
        res.status(201).json({ id, name, instance_id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// CONTATOS
app.get('/contacts', authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM contacts WHERE user_id = ?', [req.user.id]);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/contacts', authenticateToken, async (req, res) => {
    const { name, remote_jid, avatar_url } = req.body;
    const id = uuidv4();
    const DB_TYPE = process.env.DB_TYPE || 'sqlite';

    try {
        if (DB_TYPE === 'mysql') {
            await pool.query(
                'INSERT INTO contacts (id, user_id, name, remote_jid, avatar_url) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name), avatar_url = VALUES(avatar_url)',
                [id, req.user.id, name, remote_jid, avatar_url]
            );
        } else {
            // SQLite Syntax
            await pool.query(
                'INSERT INTO contacts (id, user_id, name, remote_jid, avatar_url) VALUES (?, ?, ?, ?, ?) ON CONFLICT(remote_jid) DO UPDATE SET name = excluded.name, avatar_url = excluded.avatar_url',
                [id, req.user.id, name, remote_jid, avatar_url]
            );
        }
        res.status(201).json({ message: 'Contato salvo' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// CHATBOTS
app.get('/chatbots', authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM chatbots WHERE user_id = ? ORDER BY name ASC', [req.user.id]);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/chatbots/:id/steps', authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM chatbot_steps WHERE chatbot_id = ? ORDER BY "order" ASC', [req.params.id]);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/chatbots', authenticateToken, async (req, res) => {
    const { name, trigger, type, match_type, steps } = req.body;
    const botId = uuidv4();
    const userId = req.user.id;

    try {
        // 1. Create Bot
        await pool.query(
            'INSERT INTO chatbots (id, user_id, name, trigger, status, type, match_type) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [botId, userId, name, trigger, 'ACTIVE', type, match_type]
        );

        // 2. Create Steps
        if (steps && steps.length > 0) {
            for (const step of steps) {
                await pool.query(
                    'INSERT INTO chatbot_steps (id, chatbot_id, type, content, delay, "order") VALUES (?, ?, ?, ?, ?, ?)',
                    [uuidv4(), botId, step.type, step.content, step.delay, step.order]
                );
            }
        }

        res.status(201).json({ id: botId, message: 'Bot criado com sucesso' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/chatbots/:id', authenticateToken, async (req, res) => {
    const { name, trigger, type, match_type, steps } = req.body;
    const botId = req.params.id;

    try {
        // Verify ownership
        const [existing] = await pool.query('SELECT id FROM chatbots WHERE id = ? AND user_id = ?', [botId, req.user.id]);
        if (existing.length === 0) return res.status(404).json({ error: 'Bot não encontrado' });

        // 1. Update Bot
        await pool.query(
            'UPDATE chatbots SET name = ?, trigger = ?, type = ?, match_type = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [name, trigger, type, match_type, botId]
        );

        // 2. Refresh Steps (Delete and Re-insert)
        await pool.query('DELETE FROM chatbot_steps WHERE chatbot_id = ?', [botId]);
        if (steps && steps.length > 0) {
            for (const step of steps) {
                await pool.query(
                    'INSERT INTO chatbot_steps (id, chatbot_id, type, content, delay, "order") VALUES (?, ?, ?, ?, ?, ?)',
                    [uuidv4(), botId, step.type, step.content, step.delay, step.order]
                );
            }
        }

        res.json({ message: 'Bot atualizado com sucesso' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.patch('/chatbots/:id', authenticateToken, async (req, res) => {
    const { status } = req.body;
    try {
        await pool.query('UPDATE chatbots SET status = ? WHERE id = ? AND user_id = ?', [status, req.params.id, req.user.id]);
        res.json({ message: 'Status atualizado' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/chatbots/:id', authenticateToken, async (req, res) => {
    try {
        await pool.query('DELETE FROM chatbots WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
        res.json({ message: 'Bot excluído' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// CONVERSATIONS
app.get('/conversations', authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM conversations WHERE user_id = ? ORDER BY last_message_time DESC', [req.user.id]);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.patch('/conversations/:id', authenticateToken, async (req, res) => {
    const { status, unread_count, is_blocked } = req.body;
    try {
        let query = 'UPDATE conversations SET ';
        const params = [];
        const sets = [];

        if (status !== undefined) { sets.push('status = ?'); params.push(status); }
        if (unread_count !== undefined) { sets.push('unread_count = ?'); params.push(unread_count); }
        if (is_blocked !== undefined) { sets.push('is_blocked = ?'); params.push(is_blocked ? 1 : 0); }

        if (sets.length === 0) return res.json({ message: 'No changes' });

        query += sets.join(', ') + ' WHERE id = ? AND user_id = ?';
        params.push(req.params.id, req.user.id);

        await pool.query(query, params);
        res.json({ message: 'Conversa atualizada' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/conversations/:id', authenticateToken, async (req, res) => {
    try {
        // Delete messages first (Cascade is preferred but manual for safety)
        await pool.query('DELETE FROM messages WHERE conversation_id = ?', [req.params.id]);
        await pool.query('DELETE FROM conversations WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
        res.json({ message: 'Conversa excluída' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// MESSAGES
app.get('/messages/:conversation_id', authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM messages WHERE conversation_id = ? ORDER BY timestamp ASC', [req.params.conversation_id]);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/messages', authenticateToken, async (req, res) => {
    const { conversation_id, text, sender, status, media_url, media_type, wamid } = req.body;
    const msgId = uuidv4();
    try {
        await pool.query(
            'INSERT INTO messages (id, conversation_id, text, sender, status, media_url, media_type, wamid, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)',
            [msgId, conversation_id, text, sender, status || 'sent', media_url, media_type, wamid]
        );

        // Update conversation last_message
        await pool.query(
            'UPDATE conversations SET last_message = ?, last_message_time = CURRENT_TIMESTAMP WHERE id = ?',
            [text || `[${media_type}]`, conversation_id]
        );

        res.status(201).json({ id: msgId, message: 'Mensagem enviada' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/messages/:id', authenticateToken, async (req, res) => {
    try {
        await pool.query('DELETE FROM messages WHERE id = ?', [req.params.id]);
        res.json({ message: 'Mensagem excluída' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/chatbots/greeting', authenticateToken, async (req, res) => {
    try {
        const [bots] = await pool.query('SELECT * FROM chatbots WHERE user_id = ? AND type = "GREETING" LIMIT 1', [req.user.id]);
        if (bots.length === 0) return res.json(null);

        const [steps] = await pool.query('SELECT * FROM chatbot_steps WHERE chatbot_id = ? ORDER BY "order" ASC LIMIT 1', [bots[0].id]);
        res.json({ ...bots[0], steps });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/conversations/reset-greeting', authenticateToken, async (req, res) => {
    try {
        await pool.query('UPDATE conversations SET last_greeted_at = NULL WHERE user_id = ?', [req.user.id]);
        res.json({ message: 'Saudações resetadas' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/dashboard/stats', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const sevenDaysAgoStr = sevenDaysAgo.toISOString().slice(0, 19).replace('T', ' ');

        // 1. Counts
        const [[instances]] = await pool.query('SELECT COUNT(*) as count FROM instances WHERE user_id = ?', [userId]);
        const [[chatbots]] = await pool.query('SELECT COUNT(*) as count FROM chatbots WHERE user_id = ?', [userId]);
        const [[profiles]] = await pool.query('SELECT COUNT(*) as count FROM profiles'); // Total users might be global or filter by role, but let's count all
        const [[messages]] = await pool.query('SELECT COUNT(*) as count FROM messages m JOIN conversations c ON m.conversation_id = c.id WHERE c.user_id = ?', [userId]);
        const [[conversations]] = await pool.query('SELECT COUNT(*) as count FROM conversations WHERE user_id = ?', [userId]);

        const [[sentMessages]] = await pool.query('SELECT COUNT(*) as count FROM messages m JOIN conversations c ON m.conversation_id = c.id WHERE c.user_id = ? AND m.sender = "me"', [userId]);

        // 2. Recent messages for status and weekly data
        const [recentMessages] = await pool.query(
            'SELECT m.sender, m.status, m.timestamp FROM messages m JOIN conversations c ON m.conversation_id = c.id WHERE c.user_id = ? AND m.timestamp >= ?',
            [userId, sevenDaysAgoStr]
        );

        res.json({
            instancesCount: instances.count || 0,
            chatbotsCount: chatbots.count || 0,
            usersCount: profiles.count || 0,
            totalMessages: messages.count || 0,
            sentMessages: sentMessages.count || 0,
            conversationsCount: conversations.count || 0,
            recentMessages
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PROFILE & SETTINGS
app.get('/profile', authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM profiles WHERE id = ?', [req.user.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Perfil não encontrado' });
        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.patch('/profile', authenticateToken, async (req, res) => {
    const { full_name, avatar_url } = req.body;
    try {
        let query = 'UPDATE profiles SET ';
        const params = [];
        const sets = [];

        if (full_name !== undefined) { sets.push('full_name = ?'); params.push(full_name); }
        if (avatar_url !== undefined) { sets.push('avatar_url = ?'); params.push(avatar_url); }

        if (sets.length === 0) return res.json({ message: 'No changes' });

        query += sets.join(', ') + ', updated_at = CURRENT_TIMESTAMP WHERE id = ?';
        params.push(req.user.id);

        await pool.query(query, params);
        res.json({ message: 'Perfil atualizado' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/profile/password', authenticateToken, async (req, res) => {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: 'Senha é obrigatória' });

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query('UPDATE profiles SET password_hash = ? WHERE id = ?', [hashedPassword, req.user.id]);
        res.json({ message: 'Senha atualizada' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/settings/system', authenticateToken, async (req, res) => {
    try {
        // For now, system settings are global, but we could make them per-user if needed
        const [rows] = await pool.query('SELECT * FROM system_settings LIMIT 1');
        res.json(rows[0] || null);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// CONFIGURAÇÕES DE HORÁRIO DE ATENDIMENTO
app.get('/config/business-hours', authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM business_hours WHERE user_id = ?', [req.user.id]);
        res.json(rows[0] || null);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/config/business-hours', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const {
        enabled, timezone, away_message,
        monday_enabled, monday_start, monday_end,
        tuesday_enabled, tuesday_start, tuesday_end,
        wednesday_enabled, wednesday_start, wednesday_end,
        thursday_enabled, thursday_start, thursday_end,
        friday_enabled, friday_start, friday_end,
        saturday_enabled, saturday_start, saturday_end,
        sunday_enabled, sunday_start, sunday_end
    } = req.body;

    try {
        const [existing] = await pool.query('SELECT id FROM business_hours WHERE user_id = ?', [userId]);

        if (existing.length > 0) {
            const query = `
                UPDATE business_hours SET 
                    enabled = ?, timezone = ?, away_message = ?,
                    monday_enabled = ?, monday_start = ?, monday_end = ?,
                    tuesday_enabled = ?, tuesday_start = ?, tuesday_end = ?,
                    wednesday_enabled = ?, wednesday_start = ?, wednesday_end = ?,
                    thursday_enabled = ?, thursday_start = ?, thursday_end = ?,
                    friday_enabled = ?, friday_start = ?, friday_end = ?,
                    saturday_enabled = ?, saturday_start = ?, saturday_end = ?,
                    sunday_enabled = ?, sunday_start = ?, sunday_end = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = ?
            `;
            await pool.query(query, [
                enabled, timezone, away_message,
                monday_enabled, monday_start, monday_end,
                tuesday_enabled, tuesday_start, tuesday_end,
                wednesday_enabled, wednesday_start, wednesday_end,
                thursday_enabled, thursday_start, thursday_end,
                friday_enabled, friday_start, friday_end,
                saturday_enabled, saturday_start, saturday_end,
                sunday_enabled, sunday_start, sunday_end,
                userId
            ]);
        } else {
            const query = `
                INSERT INTO business_hours (
                    id, user_id, enabled, timezone, away_message,
                    monday_enabled, monday_start, monday_end,
                    tuesday_enabled, tuesday_start, tuesday_end,
                    wednesday_enabled, wednesday_start, wednesday_end,
                    thursday_enabled, thursday_start, thursday_end,
                    friday_enabled, friday_start, friday_end,
                    saturday_enabled, saturday_start, saturday_end,
                    sunday_enabled, sunday_start, sunday_end
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            await pool.query(query, [
                uuidv4(), userId, enabled, timezone, away_message,
                monday_enabled, monday_start, monday_end,
                tuesday_enabled, tuesday_start, tuesday_end,
                wednesday_enabled, wednesday_start, wednesday_end,
                thursday_enabled, thursday_start, thursday_end,
                friday_enabled, friday_start, friday_end,
                saturday_enabled, saturday_start, saturday_end,
                sunday_enabled, sunday_start, sunday_end
            ]);
        }
        res.json({ message: 'Horário de atendimento salvo com sucesso' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// CONFIGURAÇÕES DE SAUDAÇÃO
app.get('/config/greeting', authenticateToken, async (req, res) => {
    try {
        const [bots] = await pool.query('SELECT * FROM chatbots WHERE user_id = ? AND type = "GREETING" LIMIT 1', [req.user.id]);
        if (bots.length === 0) return res.json(null);

        const [steps] = await pool.query('SELECT * FROM chatbot_steps WHERE chatbot_id = ? ORDER BY "order" ASC', [bots[0].id]);
        res.json({ ...bots[0], steps });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/config/greeting', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const { name, trigger, status, steps } = req.body;

    try {
        let botId;
        const [existing] = await pool.query('SELECT id FROM chatbots WHERE user_id = ? AND type = "GREETING"', [userId]);

        if (existing.length > 0) {
            botId = existing[0].id;
            await pool.query(
                'UPDATE chatbots SET name = ?, trigger = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [name || 'Saudação', trigger || 'cooldown:24', status || 'ACTIVE', botId]
            );
        } else {
            botId = uuidv4();
            await pool.query(
                'INSERT INTO chatbots (id, user_id, name, trigger, status, type) VALUES (?, ?, ?, ?, ?, ?)',
                [botId, userId, name || 'Saudação', trigger || 'cooldown:24', status || 'ACTIVE', 'GREETING']
            );
        }

        // Update Steps
        await pool.query('DELETE FROM chatbot_steps WHERE chatbot_id = ?', [botId]);
        if (steps && steps.length > 0) {
            for (const step of steps) {
                await pool.query(
                    'INSERT INTO chatbot_steps (id, chatbot_id, type, content, delay, "order") VALUES (?, ?, ?, ?, ?, ?)',
                    [uuidv4(), botId, step.type || 'text', step.content, step.delay || 0, step.order || 1]
                );
            }
        }

        res.json({ message: 'Saudação salva com sucesso', id: botId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/config/reset-greeting', authenticateToken, async (req, res) => {
    try {
        await pool.query('UPDATE conversations SET last_greeted_at = NULL WHERE user_id = ?', [req.user.id]);
        res.json({ message: 'Saudações resetadas com sucesso' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.patch('/settings/system', authenticateToken, async (req, res) => {
    const { api_url, api_key, webhook_url } = req.body;
    try {
        const [existing] = await pool.query('SELECT id FROM system_settings LIMIT 1');

        if (existing.length > 0) {
            await pool.query(
                'UPDATE system_settings SET api_url = ?, api_key = ?, webhook_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [api_url, api_key, webhook_url, existing[0].id]
            );
        } else {
            await pool.query(
                'INSERT INTO system_settings (id, api_url, api_key, webhook_url) VALUES (?, ?, ?, ?)',
                [uuidv4(), api_url, api_key, webhook_url]
            );
        }
        res.json({ message: 'Configurações salvas' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// WEBHOOK HANDLER (Evolution API)
// Uses REGEX to catch ALL subpaths starting with /webhook/evolution
app.all(/^\/webhook\/evolution/, async (req, res) => {
    console.log('🔹 [HANNDLER ENTRY] Route matched:', req.path); // SUPER DEBUG LOG
    try {
        const payload = req.body;
        const eventType = payload.type || payload.event;
        const data = payload.data;

        // Log trivial events only if debugging
        console.log('🔹 Webhook Recebido:', eventType, 'Instance:', payload.instance); // DEBUG LOG ADDED

        if (['QR_CODE_UPDATED', 'CONNECTION_UPDATE'].includes(eventType)) {
            // console.log('Webhook Event:', eventType);
        }

        if (!data) return res.json({ received: true });

        // 1. CONNECTION UPDATE
        if (eventType === 'connection.update' || eventType === 'CONNECTION_UPDATE') {
            const state = data.state || 'unknown';
            const instanceName = payload.instance;
            const ownerJid = data.ownerJid || data.wuid || payload.sender || null;

            await pool.query('UPDATE instances SET status = ?, owner_jid = ? WHERE name = ?', [state, ownerJid, instanceName]);
            return res.json({ received: true });
        }

        // 2. MESSAGES UPSERT
        if (eventType === 'MESSAGES_UPSERT' || eventType === 'messages.upsert') {
            const messages = data.messages || (data.key ? [data] : []);
            if (!messages.length) return res.json({ received: true });

            const instanceName = payload.instance;
            // Find Instance & User
            const [instRows] = await pool.query('SELECT id, user_id FROM instances WHERE name = ?', [instanceName]);
            if (instRows.length === 0) return res.json({ received: true }); // Instance not found locally

            const instanceId = instRows[0].id;
            const userId = instRows[0].user_id;

            for (const msg of messages) {
                if (!msg.key || !msg.message) continue;

                const remoteJid = msg.key.remoteJid;
                const fromMe = msg.key.fromMe;
                const pushName = msg.pushName || (fromMe ? 'Me' : remoteJid.split('@')[0]);
                const timestamp = new Date((msg.messageTimestamp || Date.now() / 1000) * 1000).toISOString();

                // Extract Content
                let text = '';
                let mediaType = null;
                let mediaUrl = null;
                const m = msg.message;

                if (m.conversation) { text = m.conversation; }
                else if (m.extendedTextMessage) { text = m.extendedTextMessage.text; }
                else if (m.imageMessage) { text = m.imageMessage.caption || ''; mediaType = 'image'; mediaUrl = m.imageMessage.url; }
                else if (m.videoMessage) { text = m.videoMessage.caption || ''; mediaType = 'video'; mediaUrl = m.videoMessage.url; }
                else if (m.audioMessage) { mediaType = 'audio'; mediaUrl = m.audioMessage.url; }
                else if (m.documentMessage) { text = m.documentMessage.caption || m.documentMessage.fileName || 'Doc'; mediaType = 'document'; mediaUrl = m.documentMessage.url; }
                else if (m.stickerMessage) { text = '[Sticker]'; mediaType = 'image'; mediaUrl = m.stickerMessage.url; }
                else { text = '[Midia/Outros]'; }

                // Upsert Contact (Postgres Optimized)
                try {
                    // Check if contact exists to avoid complex ON CONFLICT logic if possible, or just use standard UPSERT
                    // Postgres: ON CONFLICT (remote_jid) DO UPDATE
                    // MySQL: ON DUPLICATE KEY UPDATE
                    // SQLite: ON CONFLICT(remote_jid) DO UPDATE

                    // Detect DB Type (defaults to postgres in Docker/Supabase env)
                    const isPostgres = (process.env.DB_TYPE === 'postgres');

                    if (isPostgres) {
                        await pool.query(
                            `INSERT INTO contacts (id, user_id, name, remote_jid) VALUES ($1, $2, $3, $4) 
                             ON CONFLICT (remote_jid) DO UPDATE SET name = EXCLUDED.name`,
                            [uuidv4(), userId, pushName, remoteJid]
                        );
                    } else {
                        // Fallback for local sqlite or mysql
                        await pool.query(
                            'INSERT INTO contacts (id, user_id, name, remote_jid) VALUES (?, ?, ?, ?) ON CONFLICT(remote_jid) DO UPDATE SET name = excluded.name',
                            [uuidv4(), userId, pushName, remoteJid]
                        );
                    }
                } catch (e) {
                    console.error('Contact Upsert Error:', e.message);
                }

                // Check Conversation
                let convId;
                const [convRows] = await pool.query('SELECT * FROM conversations WHERE remote_jid = ? AND instance_id = ?', [remoteJid, instanceId]);

                if (convRows.length > 0) {
                    convId = convRows[0].id;
                    await pool.query(
                        'UPDATE conversations SET last_message = ?, last_message_time = ?, unread_count = unread_count + ? WHERE id = ?',
                        [text || `[${mediaType}]`, timestamp, (fromMe ? 0 : 1), convId]
                    );
                } else {
                    convId = uuidv4();
                    await pool.query(
                        'INSERT INTO conversations (id, user_id, instance_id, remote_jid, contact_name, last_message, last_message_time, unread_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                        [convId, userId, instanceId, remoteJid, pushName, text || `[${mediaType}]`, timestamp, (fromMe ? 0 : 1)]
                    );
                }

                // Insert Message
                await pool.query(
                    'INSERT INTO messages (id, conversation_id, text, sender, status, media_url, media_type, wamid, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    [uuidv4(), convId, text, fromMe ? 'me' : 'contact', 'sent', mediaUrl, mediaType, msg.key.id, timestamp]
                );
            }
        }

        res.json({ received: true });
    } catch (error) {
        console.error('💥 Webhook Error:', error.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Health Check
app.get('/', (req, res) => {
    res.send('Backend Online 🚀');
});

// Bind to 0.0.0.0 to allow access from Docker/Caddy
app.listen(PORT, '0.0.0.0', async () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    try {
        const [rows] = await pool.query('SELECT now()');
        console.log('✅ Database Connected:', rows[0].now);
    } catch (e) {
        console.error('❌ Database Connection Failed:', e.message);
    }
});
