-- FIX RLS & SEED SETTINGS

-- 1. Profiles RLS (Fixes 406 Error)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- 2. System Settings RLS (Fixes Public Access)
DROP POLICY IF EXISTS "Public view system settings" ON public.system_settings;
CREATE POLICY "Public view system settings" ON public.system_settings FOR SELECT USING (true);


-- 3. Trigger for Auto-Profile (Ensures profile exists on signup)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'User'), 
    new.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- 4. Seed Evolution API Settings
INSERT INTO public.system_settings (id, api_url, api_key, created_at, updated_at, captcha_provider)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'https://api.ublochat.com.br',
  'f534ab200345bc2b35ef679dde6e61ec',
  NOW(),
  NOW(),
  'none'
)
ON CONFLICT (id) DO UPDATE SET
  api_url = EXCLUDED.api_url,
  api_key = EXCLUDED.api_key;
