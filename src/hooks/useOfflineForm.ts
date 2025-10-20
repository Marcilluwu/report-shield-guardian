/**
 * HOOK PARA GESTIÓN DE FORMULARIOS OFFLINE-FIRST
 * Implementa el Patrón Queue and Sync
 */

import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  addToOutbox,
  getAllOutboxEntries,
  updateOutboxEntry,
  removeFromOutbox,
  getPendingCount,
  type OutboxEntry
} from '@/lib/outbox';
import { toast } from '@/hooks/use-toast';

// Singleton de heartbeat para evitar duplicados en StrictMode o múltiples montajes
let __heartbeatStarted = false;
let __heartbeatIntervalId: number | null = null;

interface UseOfflineFormReturn {
  isOnline: boolean;
  pendingCount: number;
  pendingEntries: OutboxEntry[];
  submitForm: (endpoint: string, data: any, method?: 'POST' | 'PUT') => Promise<{
    success: boolean;
    localId: string;
    queued: boolean;
  }>;
  refreshPendingEntries: () => Promise<void>;
  retrySync: () => Promise<void>;
}

export function useOfflineForm(): UseOfflineFormReturn {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingEntries, setPendingEntries] = useState<OutboxEntry[]>([]);

  // =====================================================
  // DETECCIÓN DE ESTADO DE CONEXIÓN
  // =====================================================

  // Usar el servicio de heartbeat centralizado
  useEffect(() => {
    // Importar dinámicamente para evitar problemas de circular dependency
    import('../services/heartbeat').then(({ HeartbeatService }) => {
      // Iniciar el servicio global
      HeartbeatService.start();
      
      // Escuchar cambios de estado
      const removeListener = HeartbeatService.addListener((isOnline) => {
        setIsOnline(isOnline);
        
        if (isOnline) {
          console.log('🟢 Conexión restaurada');
          toast({
            title: '🟢 Conexión restaurada',
            description: 'Sincronizando datos pendientes...'
          });
          retrySync();
        } else {
          console.log('🔴 Sin conexión');
          toast({
            title: '🔴 Sin conexión',
            description: 'Los datos se guardarán localmente',
            variant: 'destructive'
          });
        }
      });
      
      // Establecer estado inicial
      setIsOnline(HeartbeatService.getCurrentStatus());
      
      return removeListener;
    });
  }, []);

  // =====================================================
  // ESCUCHAR MENSAJES DEL SERVICE WORKER
  // =====================================================

  useEffect(() => {
    const channel = new BroadcastChannel('sync-channel');

    channel.onmessage = async (event) => {
      const { type, localId, error } = event.data;

      if (type === 'sync_success') {
        await updateOutboxEntry(localId, { status: 'success' });
        await removeFromOutbox(localId);
        
        toast({
          title: '✅ Sincronización exitosa',
          description: 'Los datos se han enviado correctamente al servidor.',
        });

        refreshPendingEntries();
      } else if (type === 'sync_error') {
        await updateOutboxEntry(localId, {
          status: 'failed',
          error,
          retryCount: (await getAllOutboxEntries()).find(e => e.localId === localId)?.retryCount || 0
        });

        toast({
          title: '❌ Error de sincronización',
          description: error || 'No se pudo sincronizar. Se reintentará automáticamente.',
          variant: 'destructive'
        });

        refreshPendingEntries();
      }
    };

    return () => {
      channel.close();
    };
  }, []);

  // =====================================================
  // ACTUALIZAR CONTADOR DE PENDIENTES
  // =====================================================

  const refreshPendingEntries = useCallback(async () => {
    const count = await getPendingCount();
    const entries = await getAllOutboxEntries();
    setPendingCount(count);
    setPendingEntries(entries.filter(e => e.status === 'pending' || e.status === 'syncing'));
  }, []);

  useEffect(() => {
    refreshPendingEntries();
    
    // Actualizar cada 5 segundos
    const interval = setInterval(refreshPendingEntries, 5000);
    
    return () => clearInterval(interval);
  }, [refreshPendingEntries]);

  // =====================================================
  // SUBMIT DEL FORMULARIO (CON ENCOLAMIENTO)
  // =====================================================

  const submitForm = useCallback(async (
    endpoint: string,
    data: any,
    method: 'POST' | 'PUT' = 'POST'
  ): Promise<{ success: boolean; localId: string; queued: boolean }> => {
    const localId = uuidv4();
    const payload = { ...data, localId };

    try {
      // Verificar conexión con un heartbeat rápido
      const isReallyOnline = navigator.onLine && await checkConnection();

      if (!isReallyOnline) {
        // OFFLINE: Guardar en Outbox y mostrar UI optimista
        await addToOutbox({
          localId,
          endpoint,
          method,
          payload,
          timestamp: Date.now()
        });

        // Intentar registrar sync (puede fallar si el SW no está activo)
        try {
          const registration = await navigator.serviceWorker.ready;
          await registration.sync.register('sync-form-queue');
        } catch (e) {
          console.warn('Background Sync no disponible:', e);
          try {
            const registration = await navigator.serviceWorker.ready;
            registration.active?.postMessage({ type: 'PROCESS_OUTBOX' });
          } catch {}
        }

        toast({
          title: '💾 Datos guardados localmente',
          description: 'Se sincronizarán automáticamente cuando vuelva la conexión.',
        });

        await refreshPendingEntries();

        return {
          success: true,
          localId,
          queued: true
        };
      }

      // ONLINE: Enviar inmediatamente
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      toast({
        title: '✅ Datos enviados',
        description: 'El formulario se ha enviado correctamente.',
      });

      return {
        success: true,
        localId,
        queued: false
      };

    } catch (error) {
      // Error: Guardar en Outbox para reintento
      await addToOutbox({
        localId,
        endpoint,
        method,
        payload,
        timestamp: Date.now()
      });

      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.sync.register('sync-form-queue');
      } catch (e) {
        console.warn('Background Sync no disponible:', e);
        try {
          const registration = await navigator.serviceWorker.ready;
          registration.active?.postMessage({ type: 'PROCESS_OUTBOX' });
        } catch {}
      }

      toast({
        title: '💾 Error de envío',
        description: 'Los datos se han guardado y se reintentará el envío automáticamente.',
        variant: 'destructive'
      });

      await refreshPendingEntries();

      return {
        success: false,
        localId,
        queued: true
      };
    }
  }, [refreshPendingEntries]);

  // =====================================================
  // REINTENTAR SINCRONIZACIÓN MANUAL
  // =====================================================

  const retrySync = useCallback(async () => {
    if (!navigator.onLine) {
      toast({
        title: '🔴 Sin conexión',
        description: 'No es posible sincronizar sin conexión a internet.',
        variant: 'destructive'
      });
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register('sync-form-queue');
      
      toast({
        title: '🔄 Sincronizando...',
        description: 'Se están enviando los datos pendientes.',
      });
    } catch (error) {
      console.error('Error al activar sync:', error);
      // Fallback: pedir al SW que procese la outbox ahora
      try {
        const registration = await navigator.serviceWorker.ready;
        registration.active?.postMessage({ type: 'PROCESS_OUTBOX' });
      } catch {}
      toast({
        title: '❌ Error',
        description: 'No se pudo iniciar la sincronización.',
        variant: 'destructive'
      });
    }
  }, []);

  return {
    isOnline,
    pendingCount,
    pendingEntries,
    submitForm,
    refreshPendingEntries,
    retrySync
  };
}

// =====================================================
// FUNCIÓN AUXILIAR: VERIFICAR CONEXIÓN REAL
// =====================================================

async function checkConnection(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s timeout
    
    // Usar GET sin cabeceras y no-cors para evitar CORS/preflight
    await fetch('https://n8n.n8n.instalia.synology.me/webhook/Conexion_handler?ping=1', {
      method: 'GET',
      cache: 'no-cache',
      mode: 'no-cors',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    // Con no-cors, response.ok siempre es false y type es 'opaque'
    // Si la petición se completó sin error de red, asumimos conexión
    return true;
  } catch (error) {
    // Error de red = sin conexión
    console.log('Sin conexión al servidor');
    return false;
  }
}
