// src/polyfills.ts
// ✅ Polyfills mínimos para solucionar el error de crypto

// Polyfill para global
if (typeof global === 'undefined') {
  (globalThis as any).global = globalThis;
}

// Polyfill para crypto.getRandomValues - SOLUCIÓN PRINCIPAL
if (typeof window !== 'undefined') {
  // Asegurar que crypto existe y tiene getRandomValues
  if (!window.crypto) {
    (window as any).crypto = {};
  }
  
  if (!window.crypto.getRandomValues) {
    window.crypto.getRandomValues = function(array: Uint8Array | Uint16Array | Uint32Array) {
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
      return array;
    };
  }
}

export {};