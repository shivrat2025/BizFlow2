/// <reference types="vite/client" />
import React from 'react';
// Shim process.env for browser compatibility
if (typeof (window as any).process === 'undefined') {
  (window as any).process = { env: {} };
}

import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register Service Worker for PWA with Auto-Refresh on Deployment Update
if ('serviceWorker' in navigator) {
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      console.log('⚡ New deployment detected! Auto-reloading page...');
      window.location.reload();
    }
  });

  if (import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').then(reg => {
        // Periodically check for new deployments every 30 seconds
        setInterval(() => {
          reg.update();
        }, 30000);
      }).catch(err => {
        console.log('SW registration failed: ', err);
      });
    });
  }
}
