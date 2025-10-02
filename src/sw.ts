/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core';
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { Queue } from 'workbox-background-sync';

declare const self: ServiceWorkerGlobalScope;

// Tomar control inmediatamente
clientsClaim();
self.skipWaiting();

// Limpiar cachés antiguos
cleanupOutdatedCaches();

// Precachear recursos del application shell
precacheAndRoute(self.__WB_MANIFEST);

// =====================================================
// CONFIGURACIÓN DE LA COLA DE SINCRONIZACIÓN (OUTBOX)
// =====================================================

const formQueue = new Queue('form-submissions-queue', {
  onSync: async ({ queue }) => {
    let entry;
    const broadcastChannel = new BroadcastChannel('sync-channel');
    
    while ((entry = await queue.shiftRequest())) {
      try {
        const response = await fetch(entry.request.clone());
        
        if (response.ok) {
          // Extraer el localId del body de la petición
          const clonedRequest = entry.request.clone();
          const body = await clonedRequest.json();
          const localId = body.localId;
          
          broadcastChannel.postMessage({
            type: 'sync_success',
            localId,
            timestamp: Date.now()
          });
          
          console.log('✅ Sincronización exitosa:', localId);
        } else {
          // Error permanente (4xx, 5xx)
          const clonedRequest = entry.request.clone();
          const body = await clonedRequest.json();
          const localId = body.localId;
          
          broadcastChannel.postMessage({
            type: 'sync_error',
            localId,
            error: `HTTP ${response.status}: ${response.statusText}`,
            timestamp: Date.now()
          });
          
          console.error('❌ Error en sincronización:', localId, response.status);
          
          // Si es 4xx (error del cliente), no reintentar
          if (response.status >= 400 && response.status < 500) {
            continue; // No volver a encolar
          }
          
          // Si es 5xx (error del servidor), volver a encolar
          await queue.unshiftRequest(entry);
          throw new Error(`Server error: ${response.status}`);
        }
      } catch (error) {
        // Error de red, volver a encolar para reintento
        console.warn('⚠️ Error de red, reencolando:', error);
        await queue.unshiftRequest(entry);
        throw error;
      }
    }
    
    broadcastChannel.close();
  }
});

// =====================================================
// INTERCEPTOR DE PETICIONES FALLIDAS
// =====================================================

// Interceptar peticiones POST/PUT que fallen
registerRoute(
  ({ url, request }) => {
    // Solo interceptar peticiones a endpoints de API
    return request.method === 'POST' || request.method === 'PUT';
  },
  async ({ request }) => {
    try {
      // Intentar hacer la petición normalmente
      const response = await fetch(request.clone());
      
      if (response.ok) {
        return response;
      }
      
      // Si falla, encolar
      await formQueue.pushRequest({ request: request.clone() });
      
      // Retornar respuesta de "encolado"
      return new Response(
        JSON.stringify({
          status: 'queued',
          message: 'Petición encolada para sincronización posterior'
        }),
        {
          status: 202,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    } catch (error) {
      // Error de red (offline), encolar automáticamente
      await formQueue.pushRequest({ request: request.clone() });
      
      return new Response(
        JSON.stringify({
          status: 'queued',
          message: 'Sin conexión. Los datos se sincronizarán cuando vuelva la conexión.'
        }),
        {
          status: 202,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  }
);

// =====================================================
// SYNC LISTENER (Activado desde el frontend)
// =====================================================

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-form-queue') {
    event.waitUntil(formQueue.replayRequests());
  }
});

// =====================================================
// ESTRATEGIAS DE CACHÉ PARA OTROS RECURSOS
// =====================================================

// API: Network First (priorizar datos frescos)
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'api-cache',
    networkTimeoutSeconds: 5
  })
);

// Assets estáticos: Stale While Revalidate
registerRoute(
  ({ request }) => 
    request.destination === 'image' ||
    request.destination === 'style' ||
    request.destination === 'script',
  new StaleWhileRevalidate({
    cacheName: 'assets-cache'
  })
);

// =====================================================
// MENSAJE AL ACTIVARSE
// =====================================================

self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker activado con soporte Offline-First');
});

// =====================================================
// MANEJO DE MENSAJES DEL FRONTEND
// =====================================================

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
