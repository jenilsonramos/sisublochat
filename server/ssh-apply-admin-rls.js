import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
    console.log('✅ SSH Conectado ao servidor Supabase');

    const sql = `
-- 1. Criar tabela admin_access
CREATE TABLE IF NOT EXISTS public.admin_access (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    email text UNIQUE NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

-- 2. Inserir administrador atual
INSERT INTO public.admin_access (email)
VALUES ('ublochat@admin.com')
ON CONFLICT (email) DO NOTHING;

-- 3. Atualizar função is_admin() para usar a nova tabela
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
    OR
    EXISTS (
      SELECT 1 FROM public.admin_access 
      WHERE email = auth.jwt()->>'email'
    )
  );
EXCEPTION WHEN OTHERS THEN
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Reativar RLS em tabelas críticas
ALTER TABLE public.instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbot_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 5. Garantir que as tabelas de admin continuem acessíveis apenas para admins
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_access ENABLE ROW LEVEL SECURITY;

-- 6. Políticas Adicionais (Admin Access)
DROP POLICY IF EXISTS "Admins can view admin_access" ON public.admin_access;
CREATE POLICY "Admins can view admin_access" ON public.admin_access FOR SELECT USING (is_admin());

-- 7. Notificar PostgREST
NOTIFY pgrst, 'reload schema';
`;

    const base64Sql = Buffer.from(sql).toString('base64');
    const cmd = `
echo "${base64Sql}" | base64 -d > /tmp/admin_rls_fix.sql
docker exec -i $(docker ps -q -f name=supabase_db) psql -U postgres -d postgres < /tmp/admin_rls_fix.sql
`;

    conn.exec(cmd, (err, stream) => {
        if (err) throw err;

        let output = '';
        stream.on('data', (data) => output += data.toString());
        stream.stderr.on('data', (data) => output += data.toString());
        stream.on('close', () => {
            console.log('=== RESULTADO IMPLEMENTAÇÃO ADMIN/RLS ===');
            console.log(output);
            conn.end();
        });
    });
}).connect({ host: '194.163.189.247', port: 22, username: 'root', password: 'zlPnsbN8y37?Xyaw', readyTimeout: 120000 });
