import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor Supabase');

    // Fix ALL permissions for the roles used by PostgREST
    const sql = `
-- ============================================
-- CORREÇÃO DEFINITIVA DE PERMISSÕES
-- ============================================

-- 1. Garantir que authenticator pode trocar para as roles necessárias
GRANT anon TO authenticator;
GRANT authenticated TO authenticator;
GRANT service_role TO authenticator;

-- 2. Garantir que anon pode SELECT nas tabelas públicas
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;

-- 3. Garantir que authenticated pode SELECT/INSERT/UPDATE nas tabelas
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- 4. Garantir que service_role tem acesso total
GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- 5. Permissões para storage schema também
GRANT USAGE ON SCHEMA storage TO anon, authenticated, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA storage TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA storage TO authenticated, service_role;

-- 6. Reconstruir permissões padrão para novas tabelas
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;

-- 7. IMPORTANTE: Permitir que policies funcionem corretamente
-- Garantir que auth.uid() é acessível
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role, authenticator;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA auth TO anon, authenticated, service_role, authenticator;

-- 8. Permitir consulta nas tabelas de sistema do PostgREST
GRANT SELECT ON pg_catalog.pg_namespace TO anon, authenticated;
GRANT SELECT ON pg_catalog.pg_class TO anon, authenticated;
GRANT SELECT ON pg_catalog.pg_attribute TO anon, authenticated;

-- 9. Recarregar o schema do PostgREST
NOTIFY pgrst, 'reload schema';

-- 10. Verificar resultado
SELECT 'PERMISSÕES CORRIGIDAS!' AS status;

-- 11. Testar acesso como anon
SET ROLE anon;
SELECT COUNT(*) as anon_can_read_settings FROM public.system_settings LIMIT 1;
RESET ROLE;

SET ROLE authenticated;
SELECT COUNT(*) as authenticated_can_read FROM public.profiles LIMIT 1;
RESET ROLE;
`;

    const base64Sql = Buffer.from(sql).toString('base64');
    const cmd = `
echo "${base64Sql}" | base64 -d | docker exec -i $(docker ps -q -f name=supabase_db | head -1) psql -U postgres -d postgres 2>&1

echo ""
echo "=== REINICIANDO POSTGREST ==="
docker service update --force supabase_supabase_rest 2>&1

echo ""
echo "Aguardando 8 segundos..."
sleep 8

echo "CORREÇÃO COMPLETA!"
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
            console.log('=== RESULTADO CORREÇÃO PERMISSÕES ===');
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
