import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Debug environment variables before anything else
console.log('=== APP START DEBUG ===');
console.log('All env vars:', import.meta.env);
console.log('VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('VITE_SUPABASE_ANON_KEY:', import.meta.env.VITE_SUPABASE_ANON_KEY ? 'present' : 'missing');
console.log('VITE_EXTRACTION_API_URL:', import.meta.env.VITE_EXTRACTION_API_URL);

// Test URL construction
const testUrl = import.meta.env.VITE_SUPABASE_URL;
if (testUrl) {
  console.log('Testing URL construction with:', testUrl);
  console.log('URL type:', typeof testUrl);
  console.log('URL value (JSON):', JSON.stringify(testUrl));
  try {
    new URL(testUrl);
    console.log('URL test passed');
  } catch (e) {
    console.error('URL test failed:', e);
  }
}
console.log('=== APP START DEBUG END ===');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);