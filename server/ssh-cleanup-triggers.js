import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor Supabase');

    // Cleanup triggers and inspect function
    const sql = `
-- 1. List all triggers to see them in output
SELECT tgname, proname FROM pg_trigger t JOIN pg_proc p ON t.tgfoid = p.oid WHERE tgrelid = 'auth.users'::regclass ORDER BY tgname;

-- 2. DANGER: Cleanup duplicates. We should only have ONE 'on_auth_user_created'
-- I will keep the one with the simplest name if possible, but let's see which ones are there.
-- Usually they are duplicates of the same function.

DO $$
DECLARE
    trig_record RECORD;
BEGIN
    FOR trig_record IN (
        SELECT tgname 
        FROM pg_trigger 
        WHERE tgrelid = 'auth.users'::regclass 
          AND tgname LIKE 'on_auth_user_created%'
          AND tgname != 'on_auth_user_created' -- Keep the main one if it exists
    )
    LOOP
        EXECUTE 'DROP TRIGGER ' || quote_ident(trig_record.tgname) || ' ON auth.users';
    END LOOP;
END
$$;

-- 3. Also check for 'on_user_created' (common duplicate)
DO $$
DECLARE
    trig_record RECORD;
BEGIN
    FOR trig_record IN (
        SELECT tgname 
        FROM pg_trigger 
        WHERE tgrelid = 'auth.users'::regclass 
          AND tgname LIKE 'on_user_created%'
          AND tgname != 'on_user_created'
    )
    LOOP
        EXECUTE 'DROP TRIGGER ' || quote_ident(trig_record.tgname) || ' ON auth.users';
    END LOOP;
END
$$;

-- 4. Inspect the content of 'handle_new_user' if it exists
SELECT proname, prosrc FROM pg_proc WHERE proname = 'handle_new_user';

-- 5. List triggers after cleanup
SELECT tgname, proname FROM pg_trigger t JOIN pg_proc p ON t.tgfoid = p.oid WHERE tgrelid = 'auth.users'::regclass ORDER BY tgname;
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
            console.log('=== LIMPEZA DE TRIGGERS E INSPEÇÃO ===');
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
