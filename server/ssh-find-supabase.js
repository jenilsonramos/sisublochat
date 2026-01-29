import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ Conectado');

    // Get supabase stack services
    const cmd = `docker stack services supabase --format "{{.Name}}: {{.Replicas}}" 2>/dev/null; docker ps --filter "name=supabase" --format "{{.Names}}: {{.Ports}}" 2>/dev/null; docker ps --filter "name=postgres" --format "{{.Names}}: {{.Ports}}" 2>/dev/null`;

    conn.exec(cmd, (err, stream) => {
        if (err) throw err;

        let output = '';
        stream.on('data', (data) => output += data.toString());
        stream.stderr.on('data', (data) => output += data.toString());
        stream.on('close', () => {
            console.log('=== SUPABASE/POSTGRES CONTAINERS ===');
            console.log(output);
            console.log('====================================');
            conn.end();
        });
    });
}).connect({
    host: '194.163.189.247',
    port: 22,
    username: 'root',
    password: 'zlPnsbN8y37?Xyaw'
});
