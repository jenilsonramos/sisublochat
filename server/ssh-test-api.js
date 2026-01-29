import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor de produção');

    // Test via REST API instead of direct PostgreSQL
    const cmds = [
        'echo "=== TESTANDO API SUPABASE ==="',
        'curl -s -o /dev/null -w "%{http_code}" "https://banco.ublochat.com.br/rest/v1/messages?limit=1" -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ewogICJyb2xlIjogImFub24iLAogICJpc3MiOiAic3VwYWJhc2UiLAogICJpYXQiOiAxNzE1MDUwODAwLAogICJleHAiOiAxODcyODE3MjAwCn0.IEHlSEhCYXk6E3QO785siSA5KGdmfWq_UH25z_MLuqA"',
        'echo ""',
        'echo "=== TESTANDO AUTH ==="',
        'curl -s -o /dev/null -w "%{http_code}" "https://banco.ublochat.com.br/auth/v1/health"',
        'echo ""',
        'echo "=== LOGS COMPLETOS DO BACKEND ==="',
        'docker logs ublochat_backend 2>&1 | tail -40'
    ];

    conn.exec(cmds.join(' && '), (err, stream) => {
        if (err) throw err;

        let output = '';
        stream.on('data', (data) => output += data.toString());
        stream.stderr.on('data', (data) => output += data.toString());
        stream.on('close', () => {
            console.log(output);
            conn.end();
        });
    });
}).connect({
    host: '77.42.84.214',
    port: 22,
    username: 'root',
    password: 'heagkwqejgxh',
    readyTimeout: 60000
});
