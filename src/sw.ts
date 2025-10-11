/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core';
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { Queue } from 'workbox-background-sync';
import localforage from 'localforage';

declare const self: ServiceWorkerGlobalScope;

// Configurar localForage para outbox
const outbox = localforage.createInstance({
  name: 'InspectionApp',
  storeName: 'outbox',
  description: 'Cola de transacciones pendientes de sincronización'
});

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
    event.waitUntil(
      (async () => {
        // Procesar Queue de Workbox
        await formQueue.replayRequests();
        
        // Procesar entradas del Outbox (IndexedDB)
        await processOutboxEntries();
      })()
    );
  }
});

// =====================================================
// PROCESAR ENTRADAS DEL OUTBOX (IndexedDB)
// =====================================================

async function processOutboxEntries() {
  const broadcastChannel = new BroadcastChannel('sync-channel');
  
  try {
    // Obtener todas las entradas del outbox
    const entries: any[] = [];
    await outbox.iterate((value: any) => {
      if (value.status === 'pending' || value.status === 'syncing') {
        entries.push(value);
      }
    });
    
    console.log(`📦 Procesando ${entries.length} entradas del outbox...`);
    
    // Procesar cada entrada
    for (const entry of entries) {
      try {
        // Marcar como en proceso de sincronización
        await outbox.setItem(entry.localId, {
          ...entry,
          status: 'syncing'
        });
        
        // Intentar enviar al endpoint
        const response = await fetch(entry.endpoint, {
          method: entry.method,
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(entry.payload)
        });
        
        if (response.ok) {
          // Éxito: eliminar del outbox
          await outbox.removeItem(entry.localId);
          
          broadcastChannel.postMessage({
            type: 'sync_success',
            localId: entry.localId,
            timestamp: Date.now()
          });
          
          console.log('✅ Sincronización exitosa:', entry.localId);
        } else {
          // Error HTTP: marcar como fallido
          const retryCount = (entry.retryCount || 0) + 1;
          
          await outbox.setItem(entry.localId, {
            ...entry,
            status: 'failed',
            error: `HTTP ${response.status}: ${response.statusText}`,
            retryCount
          });
          
          broadcastChannel.postMessage({
            type: 'sync_error',
            localId: entry.localId,
            error: `HTTP ${response.status}: ${response.statusText}`,
            timestamp: Date.now()
          });
          
          console.error('❌ Error en sincronización:', entry.localId, response.status);
        }
      } catch (error) {
        // Error de red: marcar como fallido pero mantener en cola
        const retryCount = (entry.retryCount || 0) + 1;
        
        await outbox.setItem(entry.localId, {
          ...entry,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Error de red',
          retryCount
        });
        
        broadcastChannel.postMessage({
          type: 'sync_error',
          localId: entry.localId,
          error: error instanceof Error ? error.message : 'Error de red',
          timestamp: Date.now()
        });
        
        console.warn('⚠️ Error de red, se reintentará:', entry.localId);
      }
    }
  } catch (error) {
    console.error('Error procesando outbox:', error);
  } finally {
    broadcastChannel.close();
  }
}

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
  const data = event.data;
  if (!data) return;
  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (data.type === 'PROCESS_OUTBOX') {
    event.waitUntil((async () => {
      try {
        await formQueue.replayRequests();
      } catch {}
      await processOutboxEntries();
    })());
  }
});
