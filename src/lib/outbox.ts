/**
 * CAPA DE PERSISTENCIA LOCAL (OUTBOX)
 * Gestiona la cola de transacciones pendientes usando IndexedDB via localForage
 */

import localforage from 'localforage';

// Configurar instancia de localForage para el Outbox
const outbox = localforage.createInstance({
  name: 'InspectionApp',
  storeName: 'outbox',
  description: 'Cola de transacciones pendientes de sincronización'
});

export interface OutboxEntry {
  localId: string;
  endpoint: string;
  method: 'POST' | 'PUT' | 'DELETE';
  payload: any;
  timestamp: number;
  retryCount: number;
  status: 'pending' | 'syncing' | 'failed' | 'success';
  error?: string;
}

/**
 * Añadir una entrada al Outbox
 */
export async function addToOutbox(entry: Omit<OutboxEntry, 'retryCount' | 'status'>): Promise<void> {
  const fullEntry: OutboxEntry = {
    ...entry,
    retryCount: 0,
    status: 'pending'
  };
  
  await outbox.setItem(entry.localId, fullEntry);
  console.log('📦 Entrada añadida al Outbox:', entry.localId);
}

/**
 * Obtener todas las entradas del Outbox
 */
export async function getAllOutboxEntries(): Promise<OutboxEntry[]> {
  const entries: OutboxEntry[] = [];
  
  await outbox.iterate<OutboxEntry, void>((value) => {
    entries.push(value);
  });
  
  return entries.sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Obtener una entrada específica
 */
export async function getOutboxEntry(localId: string): Promise<OutboxEntry | null> {
  return await outbox.getItem<OutboxEntry>(localId);
}

/**
 * Actualizar el estado de una entrada
 */
export async function updateOutboxEntry(
  localId: string,
  updates: Partial<OutboxEntry>
): Promise<void> {
  const entry = await getOutboxEntry(localId);
  
  if (entry) {
    const updatedEntry = { ...entry, ...updates };
    await outbox.setItem(localId, updatedEntry);
    console.log('🔄 Entrada actualizada:', localId, updates.status);
  }
}

/**
 * Eliminar una entrada del Outbox
 */
export async function removeFromOutbox(localId: string): Promise<void> {
  await outbox.removeItem(localId);
  console.log('🗑️ Entrada eliminada del Outbox:', localId);
}

/**
 * Limpiar todas las entradas exitosas
 */
export async function clearSuccessfulEntries(): Promise<void> {
  const entries = await getAllOutboxEntries();
  
  for (const entry of entries) {
    if (entry.status === 'success') {
      await removeFromOutbox(entry.localId);
    }
  }
  
  console.log('✨ Entradas exitosas limpiadas del Outbox');
}

/**
 * Obtener el número de entradas pendientes
 */
export async function getPendingCount(): Promise<number> {
  const entries = await getAllOutboxEntries();
  return entries.filter(e => e.status === 'pending' || e.status === 'syncing').length;
}

/**
 * Limpiar completamente el Outbox
 */
export async function clearOutbox(): Promise<void> {
  await outbox.clear();
  console.log('🧹 Outbox limpiado completamente');
}

export default outbox;
