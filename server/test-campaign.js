import pool from './db.js';

// Helper: Send Message via Evolution API
async function sendEvolutionMessage(instanceName, remoteJid, text, apiKey, apiUrl) {
    console.log(`📡 Sending to ${remoteJid} via ${instanceName}...`);
    if (!apiKey || !apiUrl) {
        console.error('❌ Missing API Key or URL');
        return false;
    }
    try {
        const url = `${apiUrl}/message/sendText/${instanceName}`;
        console.log(`   URL: ${url}`);

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
        console.log(`   Response: ${response.status}`, data);
        return response.ok;
    } catch (e) {
        console.error('   ❌ Evolution API Error:', e.message);
        return false;
    }
}

async function runTest() {
    console.log('🔍 Starting Campaign Diagnostic...');

    try {
        // 1. Check DB Connection
        console.log('1️⃣ Check Database Connection...');
        const [rows] = await pool.query('SELECT 1 as val');
        console.log('   ✅ Connected. DB Test Value:', rows[0].val);

        // 2. Check System Settings
        console.log('2️⃣ Check System Settings...');
        const [settings] = await pool.query('SELECT api_url, api_key FROM system_settings LIMIT 1');
        if (settings.length === 0) {
            console.error('   ❌ No system_settings found!');
            process.exit(1);
        }
        const config = settings[0];
        console.log('   ✅ API URL:', config.api_url);
        console.log('   ✅ API Key:', config.api_key ? '***HIDDEN***' : 'MISSING');

        // 3. Activate Scheduled Campaigns
        console.log('3️⃣ Activating Scheduled Campaigns...');
        await pool.query(`
            UPDATE campaigns 
            SET status = 'PROCESSING' 
            WHERE status = 'PENDING' 
            AND scheduled_at IS NOT NULL 
            AND scheduled_at <= NOW()
        `);
        console.log('   ✅ Scheduled campaigns updated.');

        // 4. Fetch Active Campaigns
        console.log('4️⃣ Fetching Active Campaigns (PROCESSING)...');
        const [campaigns] = await pool.query(`
            SELECT c.*, i.name as instance_name 
            FROM campaigns c 
            JOIN instances i ON c.instance_id = i.id 
            WHERE c.status = 'PROCESSING'
        `);
        console.log(`   ℹ️ Found ${campaigns.length} active campaigns.`);

        if (campaigns.length === 0) {
            console.log('   ⚠️ No campaigns to process. Exiting.');
            process.exit(0);
        }

        // 5. Process each campaign
        for (const camp of campaigns) {
            console.log(`\n📂 Processing Campaign: ${camp.name} (ID: ${camp.id})`);

            // Fetch PENDING messages
            const [messages] = await pool.query(`
                SELECT * FROM campaign_messages 
                WHERE campaign_id = ? AND status = 'PENDING' 
                LIMIT 5
            `, [camp.id]);

            console.log(`   ℹ️ Pending Messages in Batch: ${messages.length}`);

            if (messages.length === 0) {
                const [remaining] = await pool.query('SELECT COUNT(*) as count FROM campaign_messages WHERE campaign_id = ? AND status = "PENDING"', [camp.id]);
                console.log(`   ℹ️ Total Remaining: ${remaining[0].count}`);
                if (remaining[0].count === 0) {
                    // await pool.query('UPDATE campaigns SET status = "COMPLETED" WHERE id = ?', [camp.id]);
                    console.log(`   ✅ Campaign would be marked COMPLETED (Skipped for test)`);
                }
                continue;
            }

            // Send messages
            for (const msg of messages) {
                let finalText = camp.message_template || '';
                if (msg.variables) {
                    const vars = typeof msg.variables === 'string' ? JSON.parse(msg.variables) : msg.variables;
                    Object.keys(vars).forEach(key => {
                        finalText = finalText.replace(new RegExp(`{{${key}}}`, 'g'), vars[key]);
                    });
                }

                console.log(`   📨 Sending message to ${msg.remote_jid}...`);
                // Use the helper
                const success = await sendEvolutionMessage(camp.instance_name, msg.remote_jid, finalText, config.api_key, config.api_url);

                if (success) {
                    console.log('      ✅ SUCCESS');
                } else {
                    console.log('      ❌ FAILED');
                }
            }
        }

    } catch (e) {
        console.error('❌ CRITICAL ERROR:', e);
    } finally {
        console.log('\n🏁 Test Completed.');
        process.exit(0);
    }
}

runTest();
