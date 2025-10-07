import { FileSystemStorage } from './fileSystemStorage';

// Gestor de configuración para rutas de guardado
export class ConfigManager {
  private static configData: { ruta?: string } = {};

  // Solicitar acceso a carpeta usando File System Access API
  static async loadConfig(): Promise<void> {
    try {
      // Intentar usar File System Access API primero
      if (FileSystemStorage.isSupported()) {
        const granted = await FileSystemStorage.requestDirectoryAccess();
        if (granted) {
          this.configData.ruta = FileSystemStorage.getFolderName();
          return;
        }
      }
      
      // Fallback: método tradicional con archivo .txt
      await this.loadConfigFromFile();
    } catch (error) {
      console.error('Error al cargar configuración:', error);
      throw error;
    }
  }

  // Método legacy: leer configuración desde archivo de texto
  private static async loadConfigFromFile(): Promise<void> {
    return new Promise((resolve, reject) => {
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = '.txt';
      
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
    FileSystemStorage.clearConfig();
  }
  
  // Verificar si está usando File System Access API
  static isUsingFileSystemAPI(): boolean {
    return FileSystemStorage.isSupported();
  }
}