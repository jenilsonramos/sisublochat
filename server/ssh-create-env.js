import { Client } from 'ssh2';

const conn = new Client();

const newEnvContent = `VITE_SUPABASE_URL=https://banco.ublochat.com.br
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ewogICJyb2xlIjogImFub24iLAogICJpc3MiOiAic3VwYWJhc2UiLAogICJpYXQiOiAxNzE1MDUwODAwLAogICJleHAiOiAxODcyODE3MjAwCn0.IEHlSEhCYXk6E3QO785siSA5KGdmfWq_UH25z_MLuqA
VITE_EVOLUTION_API_URL=https://api.ublochat.com.br
VITE_EVOLUTION_API_KEY=6923599069fc6ab48f10c2277e730f7c
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_51N7SZpL35eGxCk7FPZzFSYAChMx1vDaVGyw8XR53xsI1RDjsaxZ0RyGBSTZJZvzuQOi05VshWw4UTaWpGNp4vQr800KUXAsj2D
VITE_WEBHOOK_URL=https://banco.ublochat.com.br/functions/v1/evolution-webhook`;

conn.on('ready', () => {
    console.log('✅ SSH Conectado');

    const cmds = [
        // Create .env file
        `echo '${newEnvContent}' > /root/ublochat/.env`,
        'echo "✅ Arquivo .env criado!"',
        'cat /root/ublochat/.env',
        'echo ""',
        // Check if we need to rebuild
        'echo "=== VERIFICANDO COMO FAZER O BUILD ==="',
        'cd /root/ublochat && cat package.json | grep -A10 "scripts"',
        'echo ""',
        'echo "=== VERIFICANDO DOCKER COMPOSE ==="',
        'cat /root/ublochat/docker-compose.prod.yml | head -50'
    ];

    conn.exec(cmds.join(' && '), (err, stream) => {
        if (err) throw err;

        let output = '';
        stream.on('data', (data) => output += data.toString());
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
