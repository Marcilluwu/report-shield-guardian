/**
 * Servicio de sincronización mejorado para el Outbox
 * Maneja reintentos automáticos y procesamiento por lotes
 */

import { 
  getAllOutboxEntries, 
  updateOutboxEntry, 
  removeFromOutbox, 
  type OutboxEntry 
} from '@/lib/outbox';

export class SyncService {
  private static isProcessing = false;
  private static maxRetries = 5;
  private static batchSize = 5; // Procesar 5 documentos a la vez
  private static retryDelay = 2000; // 2 segundos entre reintentos
  
  /**
   * Procesar todas las entradas pendientes del outbox
   */
  static async processOutbox(): Promise<{ success: number; failed: number }> {
    if (this.isProcessing) {
      console.log('⏳ Ya hay un proceso de sincronización en curso');
      return { success: 0, failed: 0 };
    }

    try {
      this.isProcessing = true;
      console.log('🔄 Iniciando sincronización del outbox...');

      const entries = await getAllOutboxEntries();
      const pendingEntries = entries.filter(
        e => e.status === 'pending' || (e.status === 'failed' && e.retryCount < this.maxRetries)
      );

      if (pendingEntries.length === 0) {
        console.log('✅ No hay entradas pendientes para sincronizar');
        return { success: 0, failed: 0 };
      }

      console.log(`📦 Procesando ${pendingEntries.length} entradas pendientes...`);

      let successCount = 0;
      let failedCount = 0;

      // Procesar en lotes para no sobrecargar la red
      for (let i = 0; i < pendingEntries.length; i += this.batchSize) {
        const batch = pendingEntries.slice(i, i + this.batchSize);
        
        const results = await Promise.allSettled(
          batch.map(entry => this.processEntry(entry))
        );

        results.forEach(result => {
          if (result.status === 'fulfilled' && result.value) {
            successCount++;
          } else {
            failedCount++;
          }
        });

        // Pequeña pausa entre lotes
        if (i + this.batchSize < pendingEntries.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      console.log(`✅ Sincronización completada: ${successCount} exitosos, ${failedCount} fallidos`);
      
      // Enviar mensaje al cliente para actualizar UI
      if ('BroadcastChannel' in window) {
        const channel = new BroadcastChannel('sync-updates');
        channel.postMessage({
          type: 'SYNC_COMPLETE',
          success: successCount,
          failed: failedCount
        });
        channel.close();
      }

      return { success: successCount, failed: failedCount };

    } catch (error) {
      console.error('❌ Error en el proceso de sincronización:', error);
      return { success: 0, failed: 0 };
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Procesar una entrada individual del outbox
   */
  private static async processEntry(entry: OutboxEntry): Promise<boolean> {
    try {
      console.log(`📤 Procesando: ${entry.payload.filename || entry.localId}`);

      // Marcar como "syncing"
      await updateOutboxEntry(entry.localId, { status: 'syncing' });

      // Intentar enviar al endpoint
      const response = await fetch(entry.endpoint, {
        method: entry.method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(entry.payload),
      });

      if (response.ok) {
        console.log(`✅ Entrada sincronizada: ${entry.payload.filename || entry.localId}`);
        
        // Eliminar del outbox si fue exitoso
        await removeFromOutbox(entry.localId);
        
        // Notificar éxito
        if ('BroadcastChannel' in window) {
          const channel = new BroadcastChannel('sync-updates');
          channel.postMessage({
            type: 'sync_success',
            localId: entry.localId,
            filename: entry.payload.filename
          });
          channel.close();
        }
        
        return true;
      } else {
        // Error en la respuesta
        const errorText = await response.text().catch(() => 'Sin mensaje de error');
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

    } catch (error) {
      console.error(`❌ Error procesando entrada ${entry.localId}:`, error);
      
      const newRetryCount = entry.retryCount + 1;
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';

      if (newRetryCount >= this.maxRetries) {
        // Marcar como fallido permanentemente
        await updateOutboxEntry(entry.localId, {
          status: 'failed',
          retryCount: newRetryCount,
          error: `Máximo de reintentos alcanzado: ${errorMessage}`
        });
        
        console.error(`❌ Entrada ${entry.localId} falló permanentemente después de ${newRetryCount} intentos`);
      } else {
        // Marcar para reintento
        await updateOutboxEntry(entry.localId, {
          status: 'pending',
          retryCount: newRetryCount,
          error: errorMessage
        });
        
        console.warn(`⚠️ Entrada ${entry.localId} marcada para reintento (${newRetryCount}/${this.maxRetries})`);
      }

      // Notificar error
      if ('BroadcastChannel' in window) {
        const channel = new BroadcastChannel('sync-updates');
        channel.postMessage({
          type: 'sync_error',
          localId: entry.localId,
          filename: entry.payload.filename,
          error: errorMessage
        });
        channel.close();
      }

      return false;
    }
  }

  /**
   * Verificar si hay conexión a internet
   */
  static async checkConnectivity(): Promise<boolean> {
    if (!navigator.onLine) {
      return false;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      await fetch('https://n8n.n8n.instalia.synology.me/webhook/Conexion_handler?ping=1', {
        method: 'GET',
        cache: 'no-cache',
        mode: 'no-cors',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Iniciar sincronización automática si hay conexión
   */
  static async autoSync(): Promise<void> {
    const isOnline = await this.checkConnectivity();
    
    if (isOnline) {
      console.log('🌐 Conexión detectada, iniciando sincronización automática...');
      await this.processOutbox();
    } else {
      console.log('📴 Sin conexión, sincronización pospuesta');
    }
  }

  /**
   * Obtener estado actual de sincronización
   */
  static isCurrentlyProcessing(): boolean {
    return this.isProcessing;
  }
}
