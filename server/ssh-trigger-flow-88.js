import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor de produção');

    const payload = {
        instance: "teste 01",
        type: "messages.upsert",
        data: {
            messages: [
                {
                    key: {
                        remoteJid: "5511999999999@s.whatsapp.net",
                        fromMe: false,
                        id: "test-flow-" + Date.now()
                    },
                    pushName: "Test User",
                    message: {
                        conversation: "88"
                    },
                    messageTimestamp: Math.floor(Date.now() / 1000)
                }
            ]
        }
    };

    const cmd = `curl -X POST http://localhost:3001/webhook/evolution -H "Content-Type: application/json" -d '${JSON.stringify(payload)}'`;

    conn.exec(cmd, (err, stream) => {
        if (err) throw err;

        let output = '';
        stream.on('data', (data) => output += data.toString());
        stream.stderr.on('data', (data) => output += data.toString());
        stream.on('close', () => {
            console.log('=== FLOW TRIGGER RESULT ===');
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
