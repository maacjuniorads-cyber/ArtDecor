import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles/global.css';

// Service worker: necessário para "Instalar app" no Android. Só em produção,
// para não atrapalhar a atualização automática durante o desenvolvimento.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // sem service worker o app continua funcionando normalmente
    });
  });
}

// iPhone: o Safari ignora "user-scalable=no"; cancela o gesto de zoom (pinça) direto.
for (const evento of ['gesturestart', 'gesturechange', 'gestureend']) {
  document.addEventListener(evento, (e) => e.preventDefault(), { passive: false });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
