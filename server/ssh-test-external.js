import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor Supabase');

    const cmd = `
echo "=== TESTANDO ENDPOINT EXTERNO ==="
curl -s "https://banco.ublochat.com.br/rest/v1/" 2>&1 | head -c 300

echo ""
echo ""
echo "=== LOGS DO SERVIÇO REST (DOCKER SWARM) ==="
docker service logs supabase_supabase_rest --tail 50 2>&1 | tail -30

echo ""
echo ""
echo "=== TESTANDO QUERY ADMIN_ACCESS ==="
curl -s "https://banco.ublochat.com.br/rest/v1/admin_access?select=email" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE" 2>&1
`;

    conn.exec(cmd, (err, stream) => {
        if (err) throw err;

        let output = '';
        stream.on('data', (data) => { output += data.toString(); });
        stream.stderr.on('data', (data) => { output += data.toString(); });
        stream.on('close', () => {
            console.log(output);
            conn.end();
        });
    });
}).connect({ host: '194.163.189.247', port: 22, username: 'root', password: 'zlPnsbN8y37?Xyaw', readyTimeout: 120000 });
