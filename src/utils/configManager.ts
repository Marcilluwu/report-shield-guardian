// Gestor de configuración para rutas de guardado
export class ConfigManager {
  private static configData: { ruta?: string } = {};

  // Leer configuración desde archivo de texto
  static async loadConfig(): Promise<void> {
    try {
      // Crear un input de archivo oculto para que el usuario seleccione el .txt
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = '.txt';
      
      return new Promise((resolve, reject) => {
        fileInput.onchange = async (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (!file) {
            reject(new Error('No se seleccionó archivo'));
            return;
          }

          try {
            const text = await file.text();
            const lines = text.split('\n');
            
            for (const line of lines) {
              const trimmedLine = line.trim();
              if (trimmedLine.includes('Ruta =')) {
                const rutaMatch = trimmedLine.match(/Ruta\s*=\s*"([^"]+)"/);
                if (rutaMatch) {
                  this.configData.ruta = rutaMatch[1];
                }
              }
            }
            resolve();
          } catch (error) {
            reject(error);
          }
        };
        
        fileInput.click();
      });
    } catch (error) {
      console.error('Error al cargar configuración:', error);
      throw error;
    }
  }

  // Obtener la ruta configurada
  static getRuta(): string {
    return this.configData.ruta || 'Reportes'; // Carpeta por defecto
  }

  // Verificar si hay configuración cargada
  static hasConfig(): boolean {
    return !!this.configData.ruta;
  }

  // Limpiar configuración
  static clearConfig(): void {
    this.configData = {};
  }
}