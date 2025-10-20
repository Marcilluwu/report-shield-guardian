/**
 * SERVICIO DE HEARTBEAT GLOBAL
 * Maneja la detección de conexión de forma centralizada
 */

// Estado global del heartbeat
let heartbeatInterval: number | null = null;
let currentConnectionStatus = navigator.onLine;
let listeners: ((isOnline: boolean) => void)[] = [];

export const HeartbeatService = {
  // Iniciar el heartbeat si no está activo
  start(): void {
    if (heartbeatInterval) return; // Ya está activo
    
    console.log('🔄 Iniciando heartbeat service cada 5 segundos');
    
    // Verificar inmediatamente
    this.checkConnection();
    
    // Verificar cada 5 segundos
    heartbeatInterval = window.setInterval(() => {
      this.checkConnection();
    }, 5000);
  },

  // Detener el heartbeat
  stop(): void {
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
      console.log('⏹️ Heartbeat service detenido');
    }
  },

  // Añadir listener para cambios de estado
  addListener(callback: (isOnline: boolean) => void): () => void {
    listeners.push(callback);
    
    // Devolver función para remover el listener
    return () => {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  },

  // Verificar conexión y notificar cambios
  async checkConnection(): Promise<void> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      console.log('🔍 Verificando conexión...');
      
      const response = await fetch('https://n8n.n8n.instalia.synology.me/webhook/Conexion_handler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ping: true, timestamp: Date.now() }),
        cache: 'no-cache',
        mode: 'no-cors',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      // Con no-cors, si llegamos aquí sin error = conexión OK
      if (!currentConnectionStatus) {
        console.log('🟢 Conexión restaurada detectada');
        currentConnectionStatus = true;
        this.notifyListeners(true);
      }
      
    } catch (error) {
      console.log('🔴 Sin conexión detectada:', error);
      if (currentConnectionStatus) {
        currentConnectionStatus = false;
        this.notifyListeners(false);
      }
    }
  },

  // Notificar a todos los listeners
  notifyListeners(isOnline: boolean): void {
    listeners.forEach(callback => {
      try {
        callback(isOnline);
      } catch (error) {
        console.error('Error en listener de heartbeat:', error);
      }
    });
  },

  // Obtener estado actual
  getCurrentStatus(): boolean {
    return currentConnectionStatus;
  }
};