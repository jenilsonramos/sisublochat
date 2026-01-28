import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const config = {
    host: process.env.DB_HOST || 'banco.ublochat.com.br',
    port: parseInt(process.env.DB_PORT || '54321'),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASS || '967d7e6b537be56e6677b96a606c7d8b',
    database: process.env.DB_NAME || 'postgres',
    ssl: false
};

const { Pool } = pg;
const pool = new Pool(config);

try {
    console.log('📊 RELATÓRIO DO BANCO DE DADOS');
    console.log('================================\n');

    // Tabelas
    const tables = await pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name
    `);

    console.log(`📋 TABELAS (${tables.rows.length} total):`);
    tables.rows.forEach((row, i) => {
        console.log(`   ${String(i + 1).padStart(2)}. ${row.table_name}`);
    });

    // Planos
    console.log('\n💰 PLANOS CADASTRADOS:');
    try {
        const plans = await pool.query('SELECT name, price, max_instances, max_contacts, ai_enabled FROM public.plans');
        plans.rows.forEach(p => {
            console.log(`   - ${p.name}: R$${p.price} (${p.max_instances} instâncias, ${p.max_contacts} contatos, IA: ${p.ai_enabled ? 'Sim' : 'Não'})`);
        });
    } catch (e) {
        console.log(`   ⚠️ ${e.message}`);
    }

    // System Settings
    console.log('\n⚙️ CONFIGURAÇÕES DO SISTEMA:');
    try {
        const settings = await pool.query('SELECT api_url, api_key, webhook_url FROM public.system_settings LIMIT 1');
        if (settings.rows[0]) {
            console.log(`   API URL: ${settings.rows[0].api_url || '(não configurado)'}`);
            console.log(`   API Key: ${settings.rows[0].api_key ? '****' + settings.rows[0].api_key.slice(-4) : '(não configurado)'}`);
            console.log(`   Webhook: ${settings.rows[0].webhook_url || '(não configurado)'}`);
        }
    } catch (e) {
        console.log(`   ⚠️ ${e.message}`);
    }

    // Contagem de registros por tabela principal
    console.log('\n📈 ESTATÍSTICAS:');
    const countTables = ['profiles', 'instances', 'conversations', 'messages', 'contacts', 'campaigns', 'flows', 'chatbots'];
    for (const table of countTables) {
        try {
            const count = await pool.query(`SELECT COUNT(*) FROM public.${table}`);
            console.log(`   ${table}: ${count.rows[0].count} registros`);
        } catch (e) {
            console.log(`   ${table}: ⚠️ erro`);
        }
    }

    console.log('\n✅ Banco de dados configurado corretamente!');

} catch (e) {
    console.error('❌ Erro:', e.message);
} finally {
    await pool.end();
}
