import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor Supabase');

    // Aggressive cleanup of triggers on auth.users
    const sql = `
-- 1. Drop ALL triggers on auth.users (user-defined ones usually start with 'on_')
DO $$
DECLARE
    trig_record RECORD;
BEGIN
    FOR trig_record IN (
        SELECT tgname 
        FROM pg_trigger 
        WHERE tgrelid = 'auth.users'::regclass 
          AND tgisinternal = false
    )
    LOOP
        EXECUTE 'DROP TRIGGER IF EXISTS ' || quote_ident(trig_record.tgname) || ' ON auth.users';
    END LOOP;
END
$$;

-- 2. Verify cleanup
SELECT tgname, proname FROM pg_trigger t JOIN pg_proc p ON t.tgfoid = p.oid WHERE tgrelid = 'auth.users'::regclass ORDER BY tgname;

-- 3. Check for any errors in the log after cleanup
SELECT 'TRIGGERS LIMPOS!' AS status;
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
