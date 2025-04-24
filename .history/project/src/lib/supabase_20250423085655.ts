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
    storage: typeof window !== 'undefined' ? window.localStorage : undefined, // Check if window exists
  }
};

let supabaseInstance: ReturnType<typeof createClient> | null = null;

export function getSupabaseClient() {
  if (!supabaseInstance) {
    // Ensure variables are read only when the function is called
    const url = window._env_?.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL;
    const key = window._env_?.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!url || !key) {
      throw new Error('Missing Supabase environment variables');
    }
    // Let TypeScript infer the client type
    supabaseInstance = createClient(url, key, options);
  }
  // Return the inferred instance type
  return supabaseInstance;
}

// Export a getter for easier access if needed, but prefer calling the function
export const supabase = {
  getClient: getSupabaseClient
};