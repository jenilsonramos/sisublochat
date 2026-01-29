import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor Supabase');

    // Test PostgREST swagger endpoint
    const cmd = `
echo "=== TESTANDO SWAGGER (VERSÃO) ==="
curl -s "http://localhost:3000/" 2>&1 | grep -o '"swagger":"[^"]*"' | head -1

echo ""
echo "=== CONTANDO DEFINIÇÕES ==="
curl -s "http://localhost:3000/" 2>&1 | grep -o '"definitions":{' | wc -l

echo ""
echo "=== VERIFICANDO ERRO ==="
curl -s "http://localhost:3000/" 2>&1 | grep -i "error" | head -5

echo ""
echo "=== LISTA DE TABELAS NO SCHEMA ==="
curl -s "http://localhost:3000/" 2>&1 | grep -o '"\/[a-z_]*":' | head -20

echo ""
echo "=== TESTANDO QUERY SIMPLES ==="
curl -s "http://localhost:3000/profiles?select=id,email&limit=1" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE" 2>&1
`;

    conn.exec(cmd, (err, stream) => {
        if (err) throw err;

        let output = '';
        stream.on('data', (data) => output += data.toString());
        stream.stderr.on('data', (data) => output += data.toString());
        stream.on('close', () => {
            console.log(output);
            conn.end();
        });
    });
}).connect({ host: '194.163.189.247', port: 22, username: 'root', password: 'zlPnsbN8y37?Xyaw', readyTimeout: 120000 });
