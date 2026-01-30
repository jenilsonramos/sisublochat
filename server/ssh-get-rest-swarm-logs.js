import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor Supabase');

    // Get PostgREST service logs from Docker Swarm
    const cmd = `
echo "=== LOGS DO SERVIÇO REST (Docker Swarm) ==="
docker service logs supabase_supabase_rest --tail 100 --no-trunc 2>&1

echo ""
echo "=== VERIFICANDO SE O SERVIÇO ESTÁ RUNNING ==="
docker service ps supabase_supabase_rest --no-trunc 2>&1

echo ""
echo "=== VERIFICANDO CONEXÃO COM O DB ==="
docker exec $(docker ps -q -f name=supabase_db | head -1) psql -U authenticator -d postgres -c "SELECT current_user, current_database();" 2>&1
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
