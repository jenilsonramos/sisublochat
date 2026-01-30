import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor Supabase');

    const cmd = `
echo "=== 1. BUSCANDO POR 'ADMIN' EM TRiggers E FUNÇÕES EM TODO O BANCO ==="
docker exec $(docker ps -q -f name=supabase_db | head -1) psql -U postgres -d postgres -c "
SELECT nspname, proname, prosrc 
FROM pg_proc p 
JOIN pg_namespace n ON p.pronamespace = n.oid 
WHERE prosrc ILIKE '%ADMIN%' AND nspname NOT IN ('pg_catalog', 'information_schema');
"

echo ""
echo "=== 2. VERIFICANDO FOREIGN KEYS EM auth.users ==="
docker exec $(docker ps -q -f name=supabase_db | head -1) psql -U postgres -d postgres -c "
SELECT
    conname as constraint_name,
    conrelid::regclass as table_name,
    confrelid::regclass as referenced_table
FROM pg_constraint
WHERE confrelid = 'auth.users'::regclass;
"

echo ""
echo "=== 3. MONITORANDO LOGS DO POSTGRES DURANTE TENTATIVA DE LOGIN (Simulação) ==="
# Vou tentar logar via curl e capturar o log do DB quase simultaneamente
(curl -s -X POST "http://localhost:8000/auth/v1/token?grant_type=password" \
  -H "Content-Type: application/json" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ewogICJyb2xlIjogImFub24iLAogICJpc3MiOiAic3VwYWJhc2UiLAogICJpYXQiOiAxNzE1MDUwODAwLAogICJleHAiOiAxODcyODE3MjAwCn0.IEHlSEhCYXk6E3QO785siSA5KGdmfWq_UH25z_MLuqA" \
  -d '{"email":"ublochat@admin.com","password":"Admin123!@#"}' > /dev/null &) ; 
sleep 1;
docker service logs supabase_supabase_db --tail 20 2>&1
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
