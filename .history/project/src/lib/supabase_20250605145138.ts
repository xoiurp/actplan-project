import { createClient, type SupabaseClientOptions } from '@supabase/supabase-js';

// Para Netlify, usamos import.meta.env diretamente
// Para Docker, as variáveis são injetadas no build time
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('Environment check:', {
  hasSupabaseUrl: !!supabaseUrl,
  hasSupabaseKey: !!supabaseAnonKey,
  supabaseUrl: supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : 'undefined'
});

// Debug detalhado da URL
console.log('Raw VITE_SUPABASE_URL:', supabaseUrl);
console.log('URL type:', typeof supabaseUrl);
console.log('URL length:', supabaseUrl?.length);
console.log('URL starts with http:', supabaseUrl?.startsWith('http'));
console.log('URL trimmed:', supabaseUrl?.trim());

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables:', {
    VITE_SUPABASE_URL: supabaseUrl,
    VITE_SUPABASE_ANON_KEY: supabaseAnonKey ? 'present' : 'missing'
  });
  throw new Error('Missing Supabase environment variables');
}

// Limpar e validar a URL
const cleanUrl = supabaseUrl.trim();
const cleanKey = supabaseAnonKey.trim();

// Validar URL antes de passar para createClient
try {
  new URL(cleanUrl);
  console.log('URL validation passed:', cleanUrl);
} catch (error) {
  console.error('Invalid Supabase URL:', cleanUrl, error);
  throw new Error(`Invalid Supabase URL: ${cleanUrl}`);
}

const options: SupabaseClientOptions<'public'> = {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined // Check if window exists
  }
};

// Initialize client directly
export const supabase = createClient(cleanUrl, cleanKey, options);