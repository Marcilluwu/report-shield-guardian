// Servicio para enviar documentos a n8n webhook
import { toast } from '@/hooks/use-toast';

interface UploadDocumentOptions {
  file: Blob;
  filename: string;
  projectName: string;
  type: 'pdf' | 'docx';
  metadata?: Record<string, any>;
}

export class WebhookApi {
  private static webhookUrl: string = 'https://n8n.n8n.instalia.synology.me/webhook/Carga_Paperless';

  // Configurar URL del webhook
  static setWebhookUrl(url: string): void {
    this.webhookUrl = url;
    localStorage.setItem('webhook_url', url);
  }

  // Obtener URL del webhook
  static getWebhookUrl(): string {
    return this.webhookUrl || localStorage.getItem('webhook_url') || '';
  }

  // Verificar si hay webhook configurado
  static hasWebhook(): boolean {
    return !!this.getWebhookUrl();
  }

  // Enviar documento al webhook
  static async uploadDocument(options: UploadDocumentOptions): Promise<boolean> {
    const { file, filename, projectName, type, metadata = {} } = options;

    if (!this.hasWebhook()) {
      console.warn('No hay webhook configurado, saltando envío');
      return false;
    }

    try {
      // Convertir blob a base64
      const base64 = await this.blobToBase64(file);

      // Preparar datos para enviar
      const payload = {
        filename,
        projectName,
        type,
        size: file.size,
        timestamp: new Date().toISOString(),
        data: base64,
        ...metadata
      };

      console.log(`Enviando ${type.toUpperCase()} a webhook:`, filename);

      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        console.log(`${type.toUpperCase()} enviado exitosamente:`, filename);
        return true;
      } else {
        console.error(`Error al enviar ${type}:`, response.status, response.statusText);
        return false;
      }
    } catch (error) {
      console.error(`Error al enviar documento a webhook:`, error);
      return false;
    }
  }

  // Convertir Blob a Base64
  private static blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        // Extraer solo la parte base64 sin el prefijo data:...
        const base64Data = base64.split(',')[1] || base64;
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  // Enviar múltiples documentos
  static async uploadMultipleDocuments(documents: UploadDocumentOptions[]): Promise<number> {
    if (!this.hasWebhook()) {
      console.warn('No hay webhook configurado');
      return 0;
    }

    let successCount = 0;

    for (const doc of documents) {
      const success = await this.uploadDocument(doc);
      if (success) successCount++;
    }

    return successCount;
  }

  // Test de conexión al webhook
  static async testConnection(): Promise<boolean> {
    if (!this.hasWebhook()) {
      toast({
        title: 'Error',
        description: 'No hay webhook configurado',
        variant: 'destructive',
      });
      return false;
    }

    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          test: true,
          timestamp: new Date().toISOString()
        }),
      });

      const isOk = response.ok;
      
      toast({
        title: isOk ? 'Conexión exitosa' : 'Error de conexión',
        description: isOk 
          ? 'El webhook está funcionando correctamente' 
          : `Error: ${response.status} ${response.statusText}`,
        variant: isOk ? 'default' : 'destructive',
      });

      return isOk;
    } catch (error) {
      toast({
        title: 'Error de conexión',
        description: error instanceof Error ? error.message : 'No se pudo conectar al webhook',
        variant: 'destructive',
      });
      return false;
    }
  }
}
