import pg from 'pg';

const { Client } = pg;

const client = new Client({
    host: '194.163.189.247',
    port: 5432,
    user: 'postgres',
    password: '8a38315997f2c27d65e06422bda8c63e',
    database: 'postgres',
    ssl: false
});

async function updateSettings() {
    try {
        console.log('🔌 Conectando ao PostgreSQL...');
        await client.connect();
        console.log('✅ Conectado!');

        // Update system_settings with Evolution API info
        console.log('📝 Atualizando system_settings...');
        await client.query(`
            DELETE FROM public.system_settings WHERE 1=1;
        `);
        await client.query(`
            INSERT INTO public.system_settings (api_url, api_key, webhook_url)
            VALUES (
                'https://api.ublochat.com.br',
                '6923599069fc6ab48f10c2277e730f7c',
                'https://banco.ublochat.com.br/functions/v1/evolution-webhook'
            );
        `);
        console.log('✅ system_settings atualizado!');

        // Verify
        const result = await client.query(`SELECT * FROM public.system_settings;`);
        console.log('📋 Configurações:', result.rows[0]);

        // Check plans
        const plans = await client.query(`SELECT name, price FROM public.plans;`);
        console.log('📋 Planos:', plans.rows);

    } catch (err) {
        console.error('❌ Erro:', err.message);
    } finally {
        await client.end();
    }
}

updateSettings();
