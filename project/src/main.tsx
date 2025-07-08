import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Debug environment variables before anything else
console.log('App initialization started');
console.log('Environment mode:', import.meta.env.MODE);
console.log('Is production:', import.meta.env.PROD);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);