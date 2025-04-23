import { createClient, type SupabaseClientOptions } from '@supabase/supabase-js';

// Ler variáveis de ambiente do objeto global (para ambiente Docker com Nginx)
// Fallback para import.meta.env (para ambiente de desenvolvimento local com Vite)
const supabaseUrl = window._env_?.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = window._env_?.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

const options: SupabaseClientOptions<'public'> = {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined // Check if window exists
  }
};

// Initialize client directly, reading from window._env_ first
export const supabase = createClient(supabaseUrl, supabaseAnonKey, options);