import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor Supabase');

    // Fix authenticator role permissions
    const sql = `
-- Check if authenticator role exists
SELECT rolname, rolcanlogin, rolsuper FROM pg_roles WHERE rolname = 'authenticator';

-- Check if password is set correctly
SELECT rolname, rolpassword IS NOT NULL as has_password FROM pg_authid WHERE rolname = 'authenticator';

-- Set password and login permission for authenticator
ALTER ROLE authenticator WITH LOGIN PASSWORD 'e52f57838865b7d25b4b8a161b3d3efa';

-- Grant necessary permissions
GRANT CONNECT ON DATABASE postgres TO authenticator;
GRANT USAGE ON SCHEMA public TO authenticator;
GRANT USAGE ON SCHEMA storage TO authenticator;
GRANT USAGE ON SCHEMA graphql_public TO authenticator;

-- Grant authenticator the ability to switch to anon and authenticated roles
GRANT anon TO authenticator;
GRANT authenticated TO authenticator;
GRANT service_role TO authenticator;

-- Verify the role after changes
SELECT rolname, rolcanlogin, rolsuper FROM pg_roles WHERE rolname = 'authenticator';

-- Test connection as authenticator (via SET ROLE)
SET ROLE authenticator;
SELECT current_user, current_database();
RESET ROLE;

SELECT 'AUTHENTICATOR ROLE CORRIGIDA!' AS status;
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
            console.log('=== CORREÇÃO DA ROLE AUTHENTICATOR ===');
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
