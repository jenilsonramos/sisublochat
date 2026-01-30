import pg from 'pg';
const { Pool } = pg;

const config = {
    // Tentar conectar no domínio público fornecido
    host: 'banco.ublochat.com.br',
    port: 5432,
    user: 'postgres',
    password: '140feba84a688d204e3a2f9945f9cd75',
    database: 'postgres',
    ssl: false // Geralmente self-hosted sem proxy TLS no postgres direto pode nao ter SSL, ou pode precisar. Vamos testar sem primeiro.
};

const pool = new Pool(config);

async function runRemoteMigration() {
    console.log(`📡 Conectando remotamente a ${config.host}...`);
    try {
        const client = await pool.connect();
        console.log('✅ Conexão bem sucedida!');

        // Importar e rodar o script de migração original seria ideal, 
        // mas como ele é um módulo auto-executável, vamos reimplementar a chamada ou fazer um require.
        // Para simplificar e evitar problemas de importação, vamos rodar a lógica aqui mesmo ou usar o child_process com env vars.

        client.release();
        process.exit(0);
    } catch (err) {
        console.error('❌ Falha na conexão:', err.message);
        process.exit(1);
    }
}

runRemoteMigration();
