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
    window.crypto.getRandomValues = function<T extends ArrayBufferView>(array: T): T {
      const uint8Array = new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
      for (let i = 0; i < uint8Array.length; i++) {
        uint8Array[i] = Math.floor(Math.random() * 256);
      }
      return array;
    };
  }
}

export {};