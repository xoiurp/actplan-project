import { createClient, type SupabaseClientOptions, type SupabaseClient } from '@supabase/supabase-js';

// Para Netlify, usamos import.meta.env diretamente
// Para Docker, as variáveis são injetadas no build time
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Não logar valores sensíveis diretamente para evitar mascaramento
console.log('Supabase initialization check:', {
  hasUrl: !!supabaseUrl,
  hasKey: !!supabaseAnonKey,
  urlType: typeof supabaseUrl,
  keyType: typeof supabaseAnonKey
});

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  throw new Error('Missing Supabase environment variables. Please check your environment configuration.');
}

// Validar se as variáveis não foram mascaradas
if (supabaseUrl.includes('*') || supabaseAnonKey.includes('*')) {
  console.error('Environment variables appear to be masked. This is a known issue with some build systems.');
  throw new Error('Environment variables are masked. Please check your build configuration.');
}

const options: SupabaseClientOptions<'public'> = {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined
  }
};

// Initialize client
let supabaseClient: SupabaseClient;

try {
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey, options);
  console.log('Supabase client initialized successfully');
} catch (error) {
  console.error('Failed to create Supabase client:', error);
  throw new Error('Failed to initialize Supabase client');
}

export const supabase = supabaseClient;