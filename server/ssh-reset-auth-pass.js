import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor Supabase');

    // Reset password for ublochat@admin.com and check metadata
    // Hash for 'Admin123!@#' (bcrypt)
    const hash = '$2a$10$7R9r.Nf.f.f.f.f.f.f.f.f.f.f.f.f.f.f.f.f.f.f.f.f.f.f.'; // This is a dummy, I'll use a better way

    // Use psql to generate a valid hash if possible or just update the raw fields
    const cmd = `
echo "=== 1. VERIFICANDO USUÁRIO ADMIN DETALHADO ==="
docker exec $(docker ps -q -f name=supabase_db | head -1) psql -U postgres -d postgres -c "
SELECT id, email, aud, role, encrypted_password, confirmed_at, recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data 
FROM auth.users WHERE email = 'ublochat@admin.com';
"

echo ""
echo "=== 2. RESETANDO SENHA PARA Admin123!@# (via pgcrypto) ==="
docker exec $(docker ps -q -f name=supabase_db | head -1) psql -U postgres -d postgres -c "
UPDATE auth.users 
SET encrypted_password = crypt('Admin123!@#', gen_salt('bf')),
    confirmed_at = now(),
    email_confirmed_at = now(),
    last_sign_in_at = NULL,
    aud = 'authenticated',
    role = 'authenticated'
WHERE email = 'ublochat@admin.com';
"

echo ""
echo "=== 3. MONITORANDO LOGS DO AUTH DURANTE TESTE ==="
# In a real shell we'd background this, but here we just tail after a test
curl -s -X POST "http://localhost:8000/auth/v1/token?grant_type=password" \
  -H "Content-Type: application/json" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ewogICJyb2xlIjogImFub24iLAogICJpc3MiOiAic3VwYWJhc2UiLAogICJpYXQiOiAxNzE1MDUwODAwLAogICJleHAiOiAxODcyODE3MjAwCn0.IEHlSEhCYXk6E3QO785siSA5KGdmfWq_UH25z_MLuqA" \
  -d '{"email":"ublochat@admin.com","password":"Admin123!@#"}' > /dev/null 2>&1

docker service logs supabase_supabase_auth --tail 20 2>&1
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
