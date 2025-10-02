# Arquitectura Offline-First - Patrón Queue and Sync

## 📋 Descripción General

Este proyecto implementa una arquitectura **Offline-First** robusta utilizando el **Patrón Queue and Sync** con **Workbox** y **localForage**. El sistema permite que los usuarios continúen trabajando sin conexión, encolando automáticamente las operaciones y sincronizándolas cuando se recupera la conectividad.

## 🏗️ Componentes Principales

### 1. Service Worker (`src/sw.ts`)

**Estrategia:** `injectManifest` (permite lógica personalizada)

**Responsabilidades:**
- Precaching del Application Shell
- Interceptación de peticiones POST/PUT fallidas
- Encolamiento automático usando `workbox-background-sync`
- Comunicación con el frontend vía Broadcast Channel API
- Reintento automático de peticiones encoladas

**Características clave:**
```typescript
// Cola de sincronización con manejo de errores
const formQueue = new Queue('form-submissions-queue', {
  onSync: async ({ queue }) => {
    // Procesar cada entrada de la cola
    // Notificar éxito/error al frontend
  }
});
```

### 2. Capa de Persistencia (`src/lib/outbox.ts`)

**Tecnología:** IndexedDB vía `localForage`

**Estructura del Outbox:**
```typescript
interface OutboxEntry {
  localId: string;          // UUID único del cliente
  endpoint: string;         // URL del API
  method: 'POST' | 'PUT';   // Método HTTP
  payload: any;             // Datos serializados
  timestamp: number;        // Hora de creación
  retryCount: number;       // Número de reintentos
  status: 'pending' | 'syncing' | 'failed' | 'success';
  error?: string;           // Mensaje de error si aplica
}
```

**API Principal:**
- `addToOutbox()` - Añadir transacción pendiente
- `getAllOutboxEntries()` - Obtener todas las entradas
- `updateOutboxEntry()` - Actualizar estado
- `removeFromOutbox()` - Eliminar tras éxito
- `getPendingCount()` - Contador de pendientes

### 3. Hook de Formularios (`src/hooks/useOfflineForm.ts`)

**Funcionalidad:**
- Detección de estado de conexión (online/offline)
- Encolamiento automático cuando hay errores
- UI Optimista (actualización inmediata de la interfaz)
- Escucha de eventos de sincronización del SW
- Contador de operaciones pendientes

**API del Hook:**
```typescript
const {
  isOnline,              // Estado de conexión
  pendingCount,          // Número de operaciones pendientes
  pendingEntries,        // Lista de entradas pendientes
  submitForm,            // Función para enviar formularios
  refreshPendingEntries, // Actualizar contador
  retrySync              // Forzar sincronización manual
} = useOfflineForm();
```

### 4. Configuración PWA (`vite.config.ts`)

**Plugin:** `vite-plugin-pwa` con estrategia `injectManifest`

```typescript
VitePWA({
  strategies: 'injectManifest',  // ✅ Esencial para lógica personalizada
  srcDir: 'src',
  filename: 'sw.ts',
  registerType: 'autoUpdate',
  // ... configuración del manifest
})
```

## 🔄 Flujo de Trabajo Completo

### Escenario 1: Usuario Online

1. Usuario completa el formulario
2. `handleSaveForm()` llama a `submitForm()`
3. Se verifica conexión con heartbeat (`/ping.txt`)
4. Petición HTTP normal al servidor
5. ✅ Respuesta exitosa → Toast de confirmación

### Escenario 2: Usuario Offline (Sin Conexión)

1. Usuario completa el formulario
2. `submitForm()` detecta `navigator.onLine === false`
3. **Datos se guardan en IndexedDB (Outbox)**
4. Se genera `localId` único (UUID)
5. **UI Optimista:** Interfaz se actualiza inmediatamente
6. Se intenta registrar `sync` event en Service Worker
7. 💾 Toast: "Datos guardados localmente"
8. **Indicador visual:** Badge muestra "X pendientes"

### Escenario 3: Recuperación de Conexión

1. Navegador detecta `online` event
2. Frontend escucha evento y muestra toast: "🟢 Conexión restaurada"
3. Se activa `retrySync()` automáticamente
4. Service Worker ejecuta `queue.replayRequests()`
5. Por cada petición encolada:
   - Se reintenta el `fetch()`
   - Si éxito (2xx): elimina de cola y notifica vía Broadcast Channel
   - Si error 4xx: notifica error y no reintenta (error del cliente)
   - Si error 5xx: reencola para nuevo reintento (error del servidor)
6. Frontend escucha Broadcast Channel:
   - `sync_success` → Actualiza UI, elimina entrada del outbox
   - `sync_error` → Muestra error al usuario

### Escenario 4: Petición Falla Durante Envío Online

1. Usuario tiene conexión pero el servidor responde con error
2. `submitForm()` captura el error en `catch`
3. Automáticamente guarda en Outbox
4. Registra sync event
5. Service Worker reintentará automáticamente

## 📡 Comunicación Bidireccional

**Service Worker → Frontend** (Broadcast Channel)

```typescript
// En el SW
broadcastChannel.postMessage({
  type: 'sync_success',
  localId: 'abc-123',
  timestamp: Date.now()
});

// En el Frontend
channel.onmessage = (event) => {
  if (event.data.type === 'sync_success') {
    // Actualizar UI
  }
};
```

## 🎨 Componentes de UI

### Indicadores de Estado

**Badge de Conexión:**
- 🟢 Verde + Icono Wifi: Online
- 🔴 Rojo + Icono WifiOff: Offline

**Contador de Pendientes:**
- Muestra número de operaciones en cola
- Solo visible cuando `pendingCount > 0`

**Botón de Sincronización Manual:**
- Visible cuando hay pendientes Y está online
- Permite forzar reintento inmediato

```tsx
<Badge variant={isOnline ? "default" : "destructive"}>
  {isOnline ? <Wifi /> : <WifiOff />}
  {isOnline ? 'Conectado' : 'Sin conexión'}
</Badge>

{pendingCount > 0 && (
  <Badge variant="secondary">
    <RefreshCw /> {pendingCount} pendiente(s)
  </Badge>
)}
```

## 🔒 Idempotencia y Consistencia

### UUID Local (localId)

Cada transacción genera un `localId` único usando `uuid.v4()`:

```typescript
const localId = uuidv4();
const payload = { ...data, localId };
```

**Propósito:**
- Identificar de forma única cada operación
- Prevenir duplicados en el servidor
- Rastrear el estado de sincronización
- Asociar respuestas del SW con entradas del outbox

### Estrategia de Resolución de Conflictos

**Server-Centric LWW (Last Write Wins):**
- El timestamp del servidor es la fuente de verdad
- El `localId` permite al servidor detectar duplicados
- El servidor es responsable de la deduplicación

## 🚀 Uso en Producción

### Guardar un Formulario

```typescript
import { useOfflineForm } from '@/hooks/useOfflineForm';

function MyForm() {
  const { submitForm, isOnline, pendingCount } = useOfflineForm();
  
  const handleSubmit = async () => {
    const result = await submitForm(
      '/api/inspections',
      formData,
      'POST'
    );
    
    if (result.queued) {
      // Guardado localmente, se sincronizará después
    } else {
      // Enviado exitosamente al servidor
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      {/* Tu formulario */}
      {pendingCount > 0 && (
        <p>Tienes {pendingCount} formularios pendientes de sincronizar</p>
      )}
    </form>
  );
}
```

### Limpiar Caché

```typescript
import { clearOutbox, clearSuccessfulEntries } from '@/lib/outbox';

// Limpiar solo entradas exitosas
await clearSuccessfulEntries();

// Limpiar todo el outbox
await clearOutbox();
```

## 🧪 Testing

### Simular Offline

**Chrome DevTools:**
1. Abrir DevTools (F12)
2. Ir a Network tab
3. Cambiar "Online" a "Offline"
4. Enviar formulario → debe guardarse localmente
5. Cambiar a "Online"
6. Observar sincronización automática

**Heartbeat Test:**
El sistema usa `/ping.txt` para verificar conexión real:

```typescript
async function checkConnection(): Promise<boolean> {
  try {
    const response = await fetch('/ping.txt', {
      method: 'HEAD',
      cache: 'no-cache'
    });
    return response.ok;
  } catch {
    return false;
  }
}
```

## 📊 Monitoring

### Console Logs

El sistema emite logs detallados:

```
🚀 Service Worker activado con soporte Offline-First
📦 Entrada añadida al Outbox: abc-123
✅ Sincronización exitosa: abc-123
❌ Error en sincronización: xyz-789 404
🗑️ Entrada eliminada del Outbox: abc-123
```

### Inspeccionar IndexedDB

**Chrome DevTools:**
1. Application tab
2. Storage → IndexedDB
3. InspectionApp → outbox
4. Ver entradas en tiempo real

## 🔧 Configuración Avanzada

### Modificar Reintentos

En `src/sw.ts`, la configuración de la Queue:

```typescript
const formQueue = new Queue('form-submissions-queue', {
  maxRetentionTime: 24 * 60, // 24 horas en minutos
  onSync: async ({ queue }) => {
    // Lógica personalizada
  }
});
```

### Agregar Endpoints Personalizados

En `useOfflineForm.ts`:

```typescript
// Ejemplo: Actualizar en lugar de crear
await submitForm('/api/inspections/123', data, 'PUT');

// Ejemplo: Eliminar
await submitForm('/api/inspections/123', {}, 'DELETE');
```

## 📚 Referencias

- [Workbox Background Sync](https://developer.chrome.com/docs/workbox/modules/workbox-background-sync/)
- [localForage Documentation](https://localforage.github.io/localForage/)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Broadcast Channel API](https://developer.mozilla.org/en-US/docs/Web/API/Broadcast_Channel_API)
- [IndexedDB Best Practices](https://web.dev/indexeddb-best-practices/)

## ✅ Checklist de Implementación

- [x] Instalar dependencias (workbox, localforage, uuid)
- [x] Configurar `vite-plugin-pwa` con `injectManifest`
- [x] Crear Service Worker personalizado (`src/sw.ts`)
- [x] Implementar capa de persistencia (`src/lib/outbox.ts`)
- [x] Crear hook de formularios (`src/hooks/useOfflineForm.ts`)
- [x] Registrar Service Worker en `main.tsx`
- [x] Integrar en componente de formulario
- [x] Añadir indicadores visuales de estado
- [x] Crear archivo `/ping.txt` para heartbeat
- [x] Documentar arquitectura

## 🎯 Ventajas de esta Arquitectura

✅ **Experiencia de Usuario Superior:**
- Funciona sin conexión
- UI optimista (respuesta inmediata)
- Sincronización transparente

✅ **Confiabilidad:**
- Reintentos automáticos
- Persistencia garantizada en IndexedDB
- Manejo robusto de errores

✅ **Escalabilidad:**
- Queue infinita (limitada por espacio en disco)
- Background Sync API usa batching inteligente
- No bloquea el hilo principal

✅ **Consistencia:**
- UUIDs previenen duplicados
- Estrategia LWW server-centric
- Feedback bidireccional SW ↔ Frontend

---

**Desarrollado siguiendo las mejores prácticas de Progressive Web Apps (PWA) y Offline-First Architecture.**
