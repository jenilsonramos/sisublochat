import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor Supabase');

    const sql = `
-- 1. System Settings
DROP POLICY IF EXISTS "Public view system settings" ON public.system_settings;
CREATE POLICY "Public view system settings" ON public.system_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins manage system settings" ON public.system_settings;
CREATE POLICY "Admins manage system settings" ON public.system_settings FOR ALL USING (is_admin());

-- 2. Admin Settings
DROP POLICY IF EXISTS "Admins manage admin settings" ON public.admin_settings;
CREATE POLICY "Admins manage admin settings" ON public.admin_settings FOR ALL USING (is_admin());

-- 3. Email Templates
DROP POLICY IF EXISTS "Admins manage email templates" ON public.email_templates;
CREATE POLICY "Admins manage email templates" ON public.email_templates FOR ALL USING (is_admin());

-- 4. Plans (Publicly viewable, Admin manageable)
DROP POLICY IF EXISTS "Public view plans" ON public.plans;
CREATE POLICY "Public view plans" ON public.plans FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins manage plans" ON public.plans;
CREATE POLICY "Admins manage plans" ON public.plans FOR ALL USING (is_admin());

-- 5. Profiles (Ensure Admin can view all profiles)
DROP POLICY IF EXISTS "Admins view all profiles" ON public.profiles;
CREATE POLICY "Admins view all profiles" ON public.profiles FOR SELECT USING (is_admin());

-- 6. Reload
NOTIFY pgrst, 'reload schema';
`;

    const base64Sql = Buffer.from(sql).toString('base64');
    const cmd = `
echo "${base64Sql}" | base64 -d > /tmp/admin_policies_fix.sql
docker exec -i $(docker ps -q -f name=supabase_db) psql -U postgres -d postgres < /tmp/admin_policies_fix.sql
`;

    conn.exec(cmd, (err, stream) => {
        if (err) throw err;

        let output = '';
        stream.on('data', (data) => output += data.toString());
        stream.stderr.on('data', (data) => output += data.toString());
        stream.on('close', () => {
            console.log('=== RESULTADO FIX ADMIN POLICIES ===');
            console.log(output);
            conn.end();
        });
    });
}).connect({ host: '194.163.189.247', port: 22, username: 'root', password: 'zlPnsbN8y37?Xyaw', readyTimeout: 120000 });
