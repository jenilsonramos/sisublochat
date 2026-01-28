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

console.log(`Conectando a: ${config.host}:${config.port}`);

const { Pool } = pg;
const pool = new Pool(config);

try {
    const result = await pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name
    `);

    console.log(`\nTabelas no schema public (${result.rows.length}):`);
    result.rows.forEach((row, i) => console.log(`  ${i + 1}. ${row.table_name}`));

    // Verificar planos
    const plans = await pool.query('SELECT name, price FROM public.plans LIMIT 5');
    console.log('\nPlanos:');
    plans.rows.forEach(p => console.log(`  - ${p.name}: R$${p.price}`));

} catch (e) {
    console.error('Erro:', e.message);
} finally {
    await pool.end();
}
