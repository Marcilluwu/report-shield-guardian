/**
 * File System Access API - Guardado automático en carpetas del sistema
 * Permite seleccionar una carpeta base y guardar archivos automáticamente
 */

export interface FileSystemConfig {
  directoryHandle: FileSystemDirectoryHandle | null;
  folderName: string;
}

export class FileSystemStorage {
  private static config: FileSystemConfig = {
    directoryHandle: null,
    folderName: 'Reportes'
  };

  /**
   * Verificar si File System Access API está disponible
   */
  static isSupported(): boolean {
    return 'showDirectoryPicker' in window;
  }

  /**
   * Solicitar acceso a una carpeta del sistema
   */
  static async requestDirectoryAccess(): Promise<boolean> {
    try {
      if (!this.isSupported()) {
        console.warn('File System Access API no disponible, usando método tradicional');
        return false;
      }

      const directoryHandle = await window.showDirectoryPicker({
        mode: 'readwrite',
        startIn: 'documents'
      });

      this.config.directoryHandle = directoryHandle;
      this.config.folderName = directoryHandle.name;

      // Verificar permisos
      const permissionState = await directoryHandle.queryPermission({ mode: 'readwrite' });
      if (permissionState === 'granted') {
        localStorage.setItem('fileSystemConfigName', directoryHandle.name);
        return true;
      }

      // Solicitar permisos si no los tenemos
      const newPermission = await directoryHandle.requestPermission({ mode: 'readwrite' });
      if (newPermission === 'granted') {
        localStorage.setItem('fileSystemConfigName', directoryHandle.name);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error al solicitar acceso al directorio:', error);
      return false;
    }
  }

  /**
   * Verificar si tenemos acceso a la carpeta
   */
  static async hasDirectoryAccess(): Promise<boolean> {
    if (!this.config.directoryHandle) return false;

    try {
      const permissionState = await this.config.directoryHandle.queryPermission({ mode: 'readwrite' });
      return permissionState === 'granted';
    } catch {
      return false;
    }
  }

  /**
   * Obtener o crear una subcarpeta dentro del directorio base
   */
  static async getOrCreateSubfolder(subfolderPath: string): Promise<FileSystemDirectoryHandle | null> {
    try {
      if (!this.config.directoryHandle) return null;

      const folders = subfolderPath.split('/').filter(f => f.length > 0);
      let currentHandle = this.config.directoryHandle;

      for (const folder of folders) {
        currentHandle = await currentHandle.getDirectoryHandle(folder, { create: true });
      }

      return currentHandle;
    } catch (error) {
      console.error('Error al crear subcarpeta:', error);
      return null;
    }
  }

  /**
   * Guardar un archivo Blob en el sistema de archivos
   */
  static async saveFile(
    blob: Blob, 
    filename: string, 
    subfolder: string = ''
  ): Promise<boolean> {
    try {
      if (!this.config.directoryHandle) {
        throw new Error('No hay acceso al directorio');
      }

      // Verificar permisos
      const hasAccess = await this.hasDirectoryAccess();
      if (!hasAccess) {
        const granted = await this.requestDirectoryAccess();
        if (!granted) return false;
      }

      // Obtener o crear la subcarpeta
      const targetDirectory = subfolder 
        ? await this.getOrCreateSubfolder(subfolder)
        : this.config.directoryHandle;

      if (!targetDirectory) return false;

      // Crear el archivo
      const fileHandle = await targetDirectory.getFileHandle(filename, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(blob);
      await writable.close();

      return true;
    } catch (error) {
      console.error('Error al guardar archivo:', error);
      return false;
    }
  }

  /**
   * Guardar logo en carpeta Logos/
   */
  static async saveLogo(blob: Blob, filename: string): Promise<boolean> {
    return this.saveFile(blob, filename, 'Logos');
  }

  /**
   * Guardar documento en docs generated/[carpeta]/
   */
  static async saveDocument(blob: Blob, filename: string, projectFolder: string): Promise<boolean> {
    return this.saveFile(blob, filename, `docs generated/${projectFolder}`);
  }

  /**
   * Verificar si existe un archivo en una ruta
   */
  static async fileExists(filename: string, subfolder: string = ''): Promise<boolean> {
    try {
      if (!this.config.directoryHandle) return false;

      const targetDirectory = subfolder 
        ? await this.getOrCreateSubfolder(subfolder)
        : this.config.directoryHandle;

      if (!targetDirectory) return false;

      await targetDirectory.getFileHandle(filename);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Obtener el nombre de la carpeta configurada
   */
  static getFolderName(): string {
    return this.config.folderName || localStorage.getItem('fileSystemConfigName') || 'Reportes';
  }

  /**
   * Limpiar configuración
   */
  static clearConfig(): void {
    this.config.directoryHandle = null;
    this.config.folderName = 'Reportes';
    localStorage.removeItem('fileSystemConfigName');
  }
}
