import { createClient, type SupabaseClientOptions, type SupabaseClient } from '@supabase/supabase-js';

// Para Netlify, usamos import.meta.env diretamente
// Para Docker, as variáveis são injetadas no build time
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('=== SUPABASE INIT DEBUG ===');
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
console.log('URL value (encoded):', supabaseUrl ? encodeURIComponent(supabaseUrl) : 'undefined');

// Verificar caracteres invisíveis
if (supabaseUrl) {
  console.log('URL char codes:');
  for (let i = 0; i < Math.min(10, supabaseUrl.length); i++) {
    console.log(`  [${i}]: '${supabaseUrl[i]}' (${supabaseUrl.charCodeAt(i)})`);
  }
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables:', {
    VITE_SUPABASE_URL: supabaseUrl,
    VITE_SUPABASE_ANON_KEY: supabaseAnonKey ? 'present' : 'missing'
  });
  throw new Error('Missing Supabase environment variables');
}

// Limpar e validar a URL
const cleanUrl = (supabaseUrl || '').toString().trim();
const cleanKey = (supabaseAnonKey || '').toString().trim();

console.log('Clean URL:', cleanUrl);
console.log('Clean URL length:', cleanUrl.length);

// Validar URL antes de passar para createClient
try {
  const urlTest = new URL(cleanUrl);
  console.log('URL validation passed:', urlTest.href);
} catch (error) {
  console.error('Invalid Supabase URL:', cleanUrl);
  console.error('Error details:', error);
  console.error('URL that failed (JSON):', JSON.stringify(cleanUrl));
  throw new Error(`Invalid Supabase URL: ${cleanUrl}`);
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
let supabaseClient: SupabaseClient | null = null;

try {
  console.log('Creating Supabase client...');
  supabaseClient = createClient(cleanUrl, cleanKey, options);
  console.log('Supabase client created successfully');
} catch (error) {
  console.error('Failed to create Supabase client:', error);
  throw error;
}

export const supabase = supabaseClient;
console.log('=== SUPABASE INIT DEBUG END ===');