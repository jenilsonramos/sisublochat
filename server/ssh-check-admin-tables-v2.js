import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor Supabase');

    // Check existence of all possible tables used in AdminView
    const tables = [
        'profiles', 'plans', 'subscriptions', 'payment_logs',
        'system_settings', 'admin_settings', 'email_templates',
        'blocked_resources', 'flows', 'chatbots', 'instances'
    ];

    const sql = `
SELECT 
    table_name, 
    EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = t.table_name
    ) as exists
FROM unnest(ARRAY['${tables.join("','")}']) as t(table_name);
`;

    conn.exec(`docker exec $(docker ps -q -f name=supabase_db) psql -U postgres -d postgres -c "${sql}"`, (err, stream) => {
        if (err) throw err;

        let output = '';
        stream.on('data', (data) => output += data.toString());
        stream.stderr.on('data', (data) => output += data.toString());
        stream.on('close', () => {
            console.log('=== VERIFICAÇÃO TABELAS ADMIN ===');
            console.log(output);
            conn.end();
        });
    });
}).connect({ host: '194.163.189.247', port: 22, username: 'root', password: 'zlPnsbN8y37?Xyaw', readyTimeout: 120000 });
