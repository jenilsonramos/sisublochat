import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor Supabase');

    // Check existence of critical tables and function
    const sql = `
SELECT 
    (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') as has_profiles,
    (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'plans') as has_plans,
    (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'subscriptions') as has_subscriptions,
    (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payment_logs') as has_payments,
    (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'system_settings') as has_settings,
    (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'email_templates') as has_emails,
    (SELECT count(*) FROM pg_proc WHERE proname = 'is_admin') as has_is_admin_func;
`;

    conn.exec(`docker exec $(docker ps -q -f name=supabase_db) psql -U postgres -d postgres -c "${sql}"`, (err, stream) => {
        if (err) throw err;

        let output = '';
        stream.on('data', (data) => output += data.toString());
        stream.stderr.on('data', (data) => output += data.toString());
        stream.on('close', () => {
            console.log('=== VERIFICAÇÃO CRÍTICA ===');
            console.log(output);
            conn.end();
        });
    });
}).connect({ host: '194.163.189.247', port: 22, username: 'root', password: 'zlPnsbN8y37?Xyaw', readyTimeout: 120000 });
