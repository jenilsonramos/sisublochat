import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor Supabase');

    // Get exact logs from the auth container
    const cmd = `
echo "=== LISTANDO CONTAINERS DE AUTH ==="
docker ps --format "table {{.Names}}\t{{.Status}}" | grep -i auth

echo ""
echo "=== OBTENDO LOGS DO CONTAINER EXATO ==="
AUTH_CONTAINER=$(docker ps -q -f name=auth | head -1)
if [ -n "$AUTH_CONTAINER" ]; then
    docker logs --tail 100 $AUTH_CONTAINER 2>&1
else
    echo "Container auth não encontrado. Tentando logs do serviço..."
    docker service logs supabase_supabase_auth --tail 100 2>&1
fi

echo ""
echo "=== VERIFICANDO CONEXÃO COM O DB VIA supabase_auth_admin ==="
docker exec $(docker ps -q -f name=supabase_db | head -1) psql -U supabase_auth_admin -d postgres -c "SELECT current_user, current_database();" 2>&1 || echo "Falha na conexão do supabase_auth_admin"
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
