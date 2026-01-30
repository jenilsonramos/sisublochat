import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor Supabase');

    const cmd = `
echo "=== 1. COMPARANDO SEGREDOS JWT ==="
AUTH_JWT=$(docker service inspect supabase_supabase_auth --format '{{ range .Spec.TaskTemplate.ContainerSpec.Env }}{{ if (slice . 0 11 | eq "JWT_SECRET=") }}{{ slice . 11 }}{{ end }}{{ end }}')
REST_JWT=$(docker service inspect supabase_supabase_rest --format '{{ range .Spec.TaskTemplate.ContainerSpec.Env }}{{ if (slice . 0 17 | eq "PGRST_JWT_SECRET=") }}{{ slice . 17 }}{{ end }}{{ end }}')

echo "Auth JWT Secret: $AUTH_JWT"
echo "Rest JWT Secret: $REST_JWT"

if [ "$AUTH_JWT" != "$REST_JWT" ]; then
    echo "⚠️ DESALINHADO! Sincronizando segredos..."
    docker service update --env-add PGRST_JWT_SECRET=$AUTH_JWT supabase_supabase_rest
else
    echo "✅ Segredos alinhados."
fi

echo ""
echo "=== 2. LIMPANDO FUNÇÕES E POLÍTICAS PROBLEMÁTICAS (WIPE) ==="
docker exec $(docker ps -q -f name=supabase_db | head -1) psql -U postgres -d postgres -c "
-- Remover funções que podem causar erro de recursão ou privilégios
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;
DROP FUNCTION IF EXISTS public.check_admin_access() CASCADE;

-- Desabilitar RLS em tabelas críticas temporariamente para garantir que o login funcione
ALTER TABLE IF EXISTS public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.subscriptions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.instances DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.system_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.admin_access DISABLE ROW LEVEL SECURITY;

-- Garantir que anon e authenticated possam ver tudo (temporariamente)
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Forçar recarregamento do PostgREST
NOTIFY pgrst, 'reload schema';
"

echo ""
echo "=== 3. REINICIANDO SERVIÇOS CRÍTICOS ==="
docker service update --force supabase_supabase_rest
docker service update --force supabase_supabase_auth
docker service update --force supabase_supabase_kong

echo "Aguardando 10 segundos..."
sleep 10
echo "=== PROCESSO CONCLUÍDO ==="
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
