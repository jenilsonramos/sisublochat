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

export const promiseWithTimeout = <T>(promise: Promise<T>, timeoutMs: number = 15000, failureMessage: string = 'Tempo limite da requisição excedido'): Promise<T> => {
  let timeoutHandle: any;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => reject(new Error(failureMessage)), timeoutMs);
  });

  return Promise.race([
    promise,
    timeoutPromise
  ]).finally(() => {
    clearTimeout(timeoutHandle);
  });
};
