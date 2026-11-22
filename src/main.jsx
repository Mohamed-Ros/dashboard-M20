import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { showError } from './utils/swal';

// Safety net: Intercept any remaining native alerts with SweetAlert2
window.alert = (message) => {
  showError('تنبيه', typeof message === 'object' ? JSON.stringify(message) : String(message || ''));
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);


// PWA: register the service worker in production only
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
