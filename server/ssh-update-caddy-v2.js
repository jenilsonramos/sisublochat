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

const b64Content = Buffer.from(CADDYFILE_CONTENT).toString('base64');

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor de produção');

    const cmds = [
        'cd /root/ublochat',
        `echo "${b64Content}" | base64 -d > Caddyfile`,
        'echo "=== CADDYFILE ATUALIZADO ==="',
        'cat Caddyfile',
        'echo ""',
        'echo "=== REINICIANDO CADDY ==="',
        'docker restart ublochat_caddy 2>&1',
        'echo ""',
        'echo "=== REINICIANDO BACKEND ==="',
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
