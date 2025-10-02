
// ✅ Importar polyfills PRIMERO, antes que cualquier otra cosa
import './polyfills';

import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// =====================================================
// REGISTRAR SERVICE WORKER (PWA + OFFLINE-FIRST)
// =====================================================

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { type: 'module' })
      .then((registration) => {
        console.log('🚀 Service Worker registrado:', registration.scope);
        
        // Escuchar actualizaciones del SW
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('🔄 Nueva versión del Service Worker disponible');
                // Podrías mostrar una notificación al usuario aquí
              }
            });
          }
        });
      })
      .catch((error) => {
        console.error('❌ Error al registrar Service Worker:', error);
      });
  });
}

createRoot(document.getElementById("root")!).render(<App />);