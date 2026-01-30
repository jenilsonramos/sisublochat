import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor Supabase');

    // Check Docker Swarm services and get error logs
    const cmd = `
echo "=== STATUS DOS SERVIÇOS DOCKER SWARM ==="
docker service ls 2>/dev/null | head -20

echo ""
echo "=== STATUS DETALHADO DO SERVIÇO REST ==="
docker service ps supabase_supabase_rest 2>/dev/null || echo "Não é swarm ou serviço não encontrado"

echo ""
echo "=== CONTAINERS EM EXECUÇÃO ==="
docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "(rest|kong|db)" | head -10

echo ""
echo "=== LOGS DO CONTAINER REST (se existir) ==="
CONTAINER_ID=$(docker ps -aq -f name=rest | head -1)
if [ -n "$CONTAINER_ID" ]; then
    docker logs $CONTAINER_ID --tail 50 2>&1
else
    echo "Container REST não encontrado. Verificando serviços..."
    docker service logs supabase_supabase_rest --tail 50 2>&1 || echo "Falha ao obter logs do serviço"
fi

echo ""
echo "=== VERIFICANDO SE DB ESTÁ ACESSÍVEL ==="
docker exec $(docker ps -q -f name=supabase_db | head -1) psql -U postgres -c "SELECT 1 as test" 2>&1 || echo "DB não acessível"
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
