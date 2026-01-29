import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado');

    const cmds = [
        'cd /root/ublochat',
        'echo "=== VERIFICAR VERSÃO DO DOCKER COMPOSE ==="',
        'docker compose version 2>/dev/null || echo "docker compose plugin não disponível"',
        'echo ""',
        'echo "=== VERIFICAR COMO O SITE ESTÁ RODANDO ==="',
        'docker service ls 2>/dev/null | head -10',
        'echo ""',
        'echo "=== CONTAINERS ATUAIS ==="',
        'docker ps',
        'echo ""',
        'echo "=== SE NÃO ESTÁ EM SWARM, USAR docker compose ==="',
        'docker compose -f docker-compose.prod.yml build --build-arg VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ewogICJyb2xlIjogImFub24iLAogICJpc3MiOiAic3VwYWJhc2UiLAogICJpYXQiOiAxNzE1MDUwODAwLAogICJleHAiOiAxODcyODE3MjAwCn0.IEHlSEhCYXk6E3QO785siSA5KGdmfWq_UH25z_MLuqA --build-arg VITE_EVOLUTION_API_KEY=6923599069fc6ab48f10c2277e730f7c --no-cache app_frontend 2>&1 | tail -20',
        'echo ""',
        'echo "=== REINICIANDO ==="',
        'docker compose -f docker-compose.prod.yml up -d 2>&1',
        'echo ""',
        'echo "=== STATUS FINAL ==="',
        'docker ps'
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
    readyTimeout: 300000
});
