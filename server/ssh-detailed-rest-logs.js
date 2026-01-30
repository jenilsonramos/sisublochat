import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor Supabase');

    // Get detailed PostgREST logs and check for the actual error
    const cmd = `
echo "=== VERIFICANDO CONTAINERS SUPABASE ==="
docker ps --format "table {{.Names}}\t{{.Status}}" | grep -i supa

echo ""
echo "=== LOGS DETALHADOS DO POSTGREST (últimas 100 linhas) ==="
docker service logs supabase_supabase_rest --tail 100 2>&1 || docker logs $(docker ps -q -f name=rest) --tail 100 2>&1

echo ""
echo "=== TESTANDO CONECTIVIDADE DO POSTGREST ==="
curl -s -w "HTTP_CODE: %{http_code}" http://localhost:3000/ 2>&1 | tail -5
`;

    conn.exec(cmd, (err, stream) => {
        if (err) {
            console.error('Erro:', err);
            conn.end();
            return;
        }

        let output = '';
        stream.on('data', (data) => {
            output += data.toString();
        });
        stream.stderr.on('data', (data) => {
            output += data.toString();
        });

        stream.on('close', () => {
            console.log(output);
            conn.end();
        });
    });
});

conn.on('error', (err) => {
    console.error('Erro SSH:', err.message);
});

conn.connect({
    host: '194.163.189.247',
    port: 22,
    username: 'root',
    password: 'zlPnsbN8y37?Xyaw',
    readyTimeout: 120000
});
