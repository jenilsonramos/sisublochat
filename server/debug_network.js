
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const EVO_URL = process.env.EVOLUTION_API_URL || 'https://api.ublochat.com.br';
const EVO_KEY = process.env.EVOLUTION_API_KEY;
const PUBLIC_WEBHOOK_URL = 'https://ublochat.com.br/webhook/evolution';
const INTERNAL_WEBHOOK_URL = 'http://localhost:3001/webhook/evolution';

async function verify() {
    console.log('--- DEBUG NETWORK START ---');
    console.log('1. Checking Evolution API Config...');

    try {
        // Fetch Instances
        const res = await fetch(`${EVO_URL}/instance/fetchInstances`, {
            headers: { 'apikey': EVO_KEY }
        });

        if (!res.ok) {
            console.log(`❌ Failed to fetch instances from Evolution API: ${res.status} ${res.statusText}`);
            const txt = await res.text();
            console.log('   Response:', txt.slice(0, 200));
        } else {
            const instances = await res.json();
            const list = Array.isArray(instances) ? instances : [];
            console.log(`✅ Found ${list.length} instances.`);

            for (const inst of list) {
                const name = inst.instance?.instanceName || inst.name;
                console.log(`   - Instance: ${name}`);

                // Get Webhook Config
                const hookRes = await fetch(`${EVO_URL}/webhook/find/${encodeURIComponent(name)}`, {
                    headers: { 'apikey': EVO_KEY }
                });
                if (hookRes.ok) {
                    const hookData = await hookRes.json();
                    console.log(`     Webhook Config:`, JSON.stringify(hookData.webhook || hookData, null, 2));
                } else {
                    console.log(`     ⚠️ Could not fetch webhook config.`);
                }
            }
        }
    } catch (err) {
        console.error('❌ Check 1 Error:', err.message);
    }

    console.log('\n2. Testing Public Webhook Reachability (NAT Loopback)...');
    try {
        const start = Date.now();
        const res = await fetch(PUBLIC_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'TEST_PROBE', instance: 'debug_probe', data: { test: true } })
        });
        console.log(`   Response Code: ${res.status}`);
        console.log(`   Duration: ${Date.now() - start}ms`);
        if (res.ok) console.log('✅ Public URL is reachable from inside container.');
        else console.log('❌ Public URL returned error.');
    } catch (err) {
        console.error('❌ Public URL Unreachable:', err.message);
        console.log('   (This means Evolution API likely cannot call this URL either if hosted similarly)');
    }

    console.log('\n3. Testing Internal Localhost Route...');
    try {
        const res = await fetch(INTERNAL_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'TEST_PROBE_LOCAL', instance: 'debug_probe_local', data: { test: true } })
        });
        console.log(`   Response Code: ${res.status}`);
        if (res.ok) console.log('✅ Internal localhost route works (Server is active).');
        else console.log('❌ Internal route failed.');
    } catch (err) {
        console.error('❌ Internal Route Error:', err.message);
    }

    console.log('--- DEBUG NETWORK END ---');
}

verify();
