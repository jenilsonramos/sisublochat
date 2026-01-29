import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor Supabase');

    // Test PostgREST Specification again
    const cmd = "docker exec $(docker ps -q -f name=supabase_rest) curl -s http://localhost:3000/";

    conn.exec(cmd, (err, stream) => {
        if (err) throw err;

        let output = '';
        stream.on('data', (data) => output += data.toString());
        stream.stderr.on('data', (data) => output += data.toString());
        stream.on('close', () => {
            console.log('=== ESPECIFICAÇÃO POSTGREST (TENTATIVA FINAL) ===');
            // If it starts with {"swagger":"2.0" it is working
            if (output.includes('"swagger":"2.0"')) {
                console.log('✅ PostgREST schema introspection is WORKING!');
            } else {
                console.log('⚠️ PostgREST still failing or returning error.');
                console.log(output.substring(0, 500));
            }
            conn.end();
        });
    });
}).connect({ host: '194.163.189.247', port: 22, username: 'root', password: 'zlPnsbN8y37?Xyaw', readyTimeout: 120000 });
