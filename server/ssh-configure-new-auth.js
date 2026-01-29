import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Client :: Connected');

    // Configure autoconfirm and check tables
    const cmds = [
        // Count tables
        `docker exec supabase_db psql -U postgres -d postgres -t -c "SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public';"`,
        // Update autoconfirm in .env
        `cd /root/supabase/docker && grep -q "GOTRUE_MAILER_AUTOCONFIRM" .env && sed -i 's/GOTRUE_MAILER_AUTOCONFIRM=.*/GOTRUE_MAILER_AUTOCONFIRM=true/g' .env || echo "GOTRUE_MAILER_AUTOCONFIRM=true" >> .env`,
        `cd /root/supabase/docker && grep -q "GOTRUE_SMS_AUTOCONFIRM" .env && sed -i 's/GOTRUE_SMS_AUTOCONFIRM=.*/GOTRUE_SMS_AUTOCONFIRM=true/g' .env || echo "GOTRUE_SMS_AUTOCONFIRM=true" >> .env`,
        // Restart auth container
        `cd /root/supabase/docker && docker compose restart auth`,
        `echo "Auth container restarted with autoconfirm enabled!"`
    ];

    conn.exec(cmds.join(' && '), (err, stream) => {
        if (err) {
            console.error('❌ Exec Error:', err.message);
            conn.end();
            return;
        }

        let output = '';
        let errorOutput = '';

        stream.on('data', (data) => {
            output += data.toString();
        });

        stream.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });

        stream.on('close', (code) => {
            console.log('---- OUTPUT ----');
            console.log(output);
            if (errorOutput) {
                console.log('---- STDERR ----');
                console.log(errorOutput);
            }
            console.log('----------------');
            conn.end();
        });
    });
}).connect({
    host: '194.163.189.247',
    port: 22,
    username: 'root',
    password: 'zlPnsbN8y37?Xyaw',
    readyTimeout: 30000
});

conn.on('error', (err) => {
    console.error('❌ SSH Connection Error:', err.message);
});
