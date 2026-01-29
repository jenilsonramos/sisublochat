import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor de produção');

    const endpoints = [
        '/chat/presenceUpdate',
        '/chat/updatePresence',
        '/chat/setPresence',
        '/instance/setPresence',
        '/message/markMessageAsRead',
        '/chat/markMessageAsRead',
        '/chat/markRead'
    ];

    const instance = 'teste%2001';
    const apiKey = '6923599069fc6ab48f10c2277e730f7c';
    const baseUrl = 'https://api.ublochat.com.br';

    let cmds = endpoints.map(ep =>
        `echo "TEST: ${ep}" && curl -s -o /dev/null -w "%{http_code}" -X POST "${baseUrl}${ep}/${instance}" -H "apikey: ${apiKey}" -H "Content-Type: application/json" -d '{"number":"5511999999999@s.whatsapp.net","presence":"composing"}' && echo ""`
    );

    conn.exec(cmds.join(' && '), (err, stream) => {
        if (err) throw err;

        let output = '';
        stream.on('data', (data) => output += data.toString());
        stream.stderr.on('data', (data) => output += data.toString());
        stream.on('close', () => {
            console.log('=== ENDPOINT SCAN RESULTS ===');
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
