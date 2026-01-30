import { Client } from 'ssh2';

// Connect to production frontend server
const conn1 = new Client();
const conn2 = new Client();

let frontendEnv = '';
let supabaseEnv = '';

conn1.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor de Produção (Frontend)');

    conn1.exec('cat /root/ublochat/.env 2>/dev/null || echo "No .env file"', (err, stream) => {
        if (err) throw err;

        stream.on('data', (data) => { frontendEnv += data.toString(); });
        stream.stderr.on('data', (data) => { frontendEnv += data.toString(); });
        stream.on('close', () => {
            console.log('=== FRONTEND .ENV ===');
            console.log(frontendEnv);

            // Now connect to Supabase server
            conn2.connect({ host: '194.163.189.247', port: 22, username: 'root', password: 'zlPnsbN8y37?Xyaw', readyTimeout: 120000 });
        });
    });
}).connect({ host: '77.42.84.214', port: 22, username: 'root', password: 'X4cusMK3tHWv', readyTimeout: 120000 });

conn2.on('ready', () => {
    console.log('\n✅ SSH Conectado ao servidor Supabase');

    conn2.exec('cd /root/supabase && cat .env | grep -E "(ANON|SERVICE|JWT)"', (err, stream) => {
        if (err) throw err;

        stream.on('data', (data) => { supabaseEnv += data.toString(); });
        stream.stderr.on('data', (data) => { supabaseEnv += data.toString(); });
        stream.on('close', () => {
            console.log('=== SUPABASE .ENV ===');
            console.log(supabaseEnv);
            conn1.end();
            conn2.end();
        });
    });
});
