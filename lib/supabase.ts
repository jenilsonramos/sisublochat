import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

export const isAbortError = (err: any) => {
  if (!err) return false;
  if (err.name === 'AbortError') return true;
  const message = (err.message || '').toLowerCase();
  return (
    message.includes('aborted') ||
    message.includes('signal is aborted') ||
    err.code === '20' ||
    err.code === 20
  );
};
