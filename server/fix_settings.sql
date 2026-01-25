-- FORCE UPDATE EVOLUTION API URL
UPDATE public.system_settings
SET 
    api_url = 'https://api.ublochat.com.br',
    api_key = 'f534ab200345bc2b35ef679dde6e61ec'
WHERE id = '00000000-0000-0000-0000-000000000001';

-- INSERT IF NOT EXISTS (Just in case the update above affected 0 rows)
INSERT INTO public.system_settings (id, api_url, api_key)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'https://api.ublochat.com.br',
    'f534ab200345bc2b35ef679dde6e61ec'
)
ON CONFLICT (id) DO UPDATE SET
    api_url = EXCLUDED.api_url,
    api_key = EXCLUDED.api_key;


-- FIX MISSING PROFILE (for the user 59b2e5a4...)
INSERT INTO public.profiles (id, email, full_name, role)
SELECT id, email, COALESCE(raw_user_meta_data->>'full_name', 'Admin User'), 'ADMIN'
FROM auth.users
WHERE id = '59b2e5a4-747e-4951-808c-c5424a18d45b'
ON CONFLICT (id) DO UPDATE SET
    role = 'ADMIN'; 
-- Promotes to admin just in case
