
// ✅ Importar polyfills PRIMERO, antes que cualquier otra cosa
import './polyfills';

import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// =====================================================
// REGISTRAR SERVICE WORKER (PWA + OFFLINE-FIRST)
// =====================================================

if ('serviceWorker' in navigator) {
  // Usar el registrador del plugin PWA para evitar redirecciones prohibidas
  import('virtual:pwa-register')
    .then(({ registerSW }) => {
      const updateSW = registerSW({
        immediate: true,
        onRegistered(registration) {
          console.log('🚀 Service Worker registrado:', registration?.scope);
        },
        onRegisterError(error) {
          console.error('❌ Error al registrar Service Worker (PWA):', error);
        },
      });
    })
    .catch((error) => {
      console.error('❌ Error importando registrador PWA:', error);
    });
}

createRoot(document.getElementById("root")!).render(<App />);