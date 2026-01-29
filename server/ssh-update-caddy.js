import { Client } from 'ssh2';

const conn = new Client();

const CADDYFILE_CONTENT = `ublochat.com.br {
    # Webhook route - Proxy to NodeJS Backend
    handle /webhook/* {
        reverse_proxy ublochat_backend:3001
    }

    # API and Auth routes - Proxy to NodeJS Backend
    handle /auth/* {
        reverse_proxy ublochat_backend:3001
    }
    
    handle /instances* {
        reverse_proxy ublochat_backend:3001
    }

    # Default - Proxy to React Frontend
    handle {
        reverse_proxy ublochat_frontend:80
    }
}`;

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor de produção');

    const escapedContent = CADDYFILE_CONTENT.replace(/'/g, "'\\''");

    const cmds = [
        'cd /root/ublochat',
        `echo '${escapedContent}' > Caddyfile`,
        'echo "=== CADDYFILE ATUALIZADO ==="',
        'cat Caddyfile',
        'echo ""',
        'echo "=== APLICANDO CONFIGURAÇÃO NO CADDY ==="',
        'docker exec ublochat_caddy caddy reload --config /etc/caddy/Caddyfile 2>&1',
        'echo ""',
        'echo "=== LIMPANDO LOGS DO BACKEND PARA TESTE ==="',
        '# Note: Docker logs cannot be cleared easily, but we can restart to start fresh',
        'docker restart ublochat_backend 2>&1'
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
