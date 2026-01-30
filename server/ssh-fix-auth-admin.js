import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor Supabase');

    // Fix supabase_auth_admin role
    const sql = `
-- 1. Ensure supabase_auth_admin exists and has the correct password
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_auth_admin') THEN
        CREATE ROLE supabase_auth_admin WITH LOGIN PASSWORD 'e52f57838865b7d25b4b8a161b3d3efa';
    ELSE
        ALTER ROLE supabase_auth_admin WITH LOGIN PASSWORD 'e52f57838865b7d25b4b8a161b3d3efa';
    END IF;
END
$$;

-- 2. Grant superuser to supabase_auth_admin (it needs full access to manage auth schema)
ALTER ROLE supabase_auth_admin WITH SUPERUSER CREATEROLE CREATEDB REPLICATION BYPASSRLS;

-- 3. Grant connection permission
GRANT CONNECT ON DATABASE postgres TO supabase_auth_admin;

-- 4. Ensure auth schema exists and is owned correctly
GRANT ALL PRIVILEGES ON SCHEMA auth TO supabase_auth_admin;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA auth TO supabase_auth_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA auth TO supabase_auth_admin;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA auth TO supabase_auth_admin;

-- 5. Check if the user can now connect
SELECT rolname, rolcanlogin, rolsuper FROM pg_roles WHERE rolname = 'supabase_auth_admin';

SELECT 'SUPABASE_AUTH_ADMIN CORRIGIDA!' AS status;
`;

    const base64Sql = Buffer.from(sql).toString('base64');
    const cmd = `echo "${base64Sql}" | base64 -d | docker exec -i $(docker ps -q -f name=supabase_db | head -1) psql -U postgres -d postgres 2>&1`;

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
            console.log('=== RESULTADO CORREÇÃO AUTH ADMIN ===');
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
