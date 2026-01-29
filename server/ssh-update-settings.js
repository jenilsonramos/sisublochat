import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado');

    // Find the supabase_db container
    conn.exec('docker ps --format "{{.Names}}" | grep -i supabase | grep -i db | head -1', (err, stream) => {
        if (err) throw err;

        let containerName = '';
        stream.on('data', (data) => containerName += data.toString().trim());
        stream.on('close', () => {
            console.log('📦 Container:', containerName);

            if (!containerName) {
                console.log('❌ Container não encontrado!');
                conn.end();
                return;
            }

            // Update system_settings
            const sql = `
                DELETE FROM public.system_settings WHERE 1=1;
                INSERT INTO public.system_settings (api_url, api_key, webhook_url)
                VALUES (
                    'https://api.ublochat.com.br',
                    '6923599069fc6ab48f10c2277e730f7c',
                    'https://banco.ublochat.com.br/functions/v1/evolution-webhook'
                );
            `;

            const cmd = `docker exec ${containerName} psql -U postgres -d postgres -c "${sql.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`;

            console.log('📝 Atualizando system_settings...');
            conn.exec(cmd, (err, stream2) => {
                let output = '';
                stream2.on('data', (d) => output += d.toString());
                stream2.on('close', () => {
                    console.log('✅ Resultado:', output);

                    // Verify settings
                    const verifyCmd = `docker exec ${containerName} psql -U postgres -d postgres -c "SELECT api_url, api_key FROM public.system_settings;"`;
                    conn.exec(verifyCmd, (err, stream3) => {
                        let verify = '';
                        stream3.on('data', (d) => verify += d.toString());
                        stream3.on('close', () => {
                            console.log('📋 Configurações atuais:');
                            console.log(verify);
                            conn.end();
                        });
                    });
                });
            });
        });
    });
}).connect({
    host: '194.163.189.247',
    port: 22,
    username: 'root',
    password: 'zlPnsbN8y37?Xyaw',
    readyTimeout: 60000
});
