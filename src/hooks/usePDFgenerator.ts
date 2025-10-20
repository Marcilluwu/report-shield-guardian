// hooks/usePDFGenerator.ts
// ✅ Hook personalizado para generar PDFs de manera robusta

import { useState, useCallback } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { toast } from '@/hooks/use-toast';
import { FileSystemStorage } from '@/utils/fileSystemStorage';
import { ConfigManager } from '@/utils/configManager';
import { generateDocx } from '@/utils/docxGenerator';
import { WebhookApi } from '@/services/webhookApi';

interface PDFGenerationOptions {
  filename?: string;
  quality?: number;
  scale?: number;
  projectFolder?: string; // Carpeta del proyecto dentro de "docs generated/"
}

interface GenerateDualOptions extends PDFGenerationOptions {
  inspectionData: any;
  signatureName: string;
  logoUrl?: string;
  signatureDataUrl?: string;
}

interface UsePDFGeneratorReturn {
  isGenerating: boolean;
  progress: number;
  generatePDF: (elementRef: React.RefObject<HTMLElement>, options?: PDFGenerationOptions) => Promise<boolean>;
  generateDualDocument: (elementRef: React.RefObject<HTMLElement>, options: GenerateDualOptions) => Promise<boolean>;
  printDocument: (elementRef: React.RefObject<HTMLElement>) => void;
}

export const usePDFGenerator = (): UsePDFGeneratorReturn => {
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  
  // ✅ Configuración optimizada para html2canvas
  const getHtml2CanvasConfig = (scale: number = 2) => ({
    scale,
    useCORS: true,
    allowTaint: false,
    backgroundColor: '#ffffff',
    logging: false,
    removeContainer: true,
    imageTimeout: 15000, // 15 segundos de timeout
    height: null,
    width: null,
    scrollX: 0,
    scrollY: 0,
  });

  // ✅ Función principal para generar PDF
  const generatePDF = useCallback(async (
    elementRef: React.RefObject<HTMLElement>,
    options: PDFGenerationOptions = {}
  ): Promise<boolean> => {
    const {
      filename = `documento-${new Date().toISOString().split('T')[0]}.pdf`,
      quality = 1.0,
      scale = 2
    } = options;

    try {
      setIsGenerating(true);
      setProgress(10);

      // ✅ Validar referencia del elemento
      if (!elementRef.current) {
        toast({
          title: 'Error',
          description: 'No se encontró el elemento para generar PDF',
          variant: 'destructive',
        });
        return false;
      }

      setProgress(20);

      // ¿Existen páginas definidas explícitamente?
      const container = elementRef.current as HTMLElement;
      const pageNodes = container.querySelectorAll('.pdf-page');

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      if (pageNodes.length > 0) {
        // Generación página a página para evitar cortes de imágenes
        let first = true;
        for (const node of Array.from(pageNodes)) {
          const canvas = await html2canvas(node as HTMLElement, getHtml2CanvasConfig(scale));
          if (!canvas) throw new Error('No se pudo generar el canvas de una página');

          const imgData = canvas.toDataURL('image/png', quality);
          if (!imgData || imgData === 'data:,') throw new Error('No se pudieron obtener los datos de la imagen');

          const ratio = Math.min(pageWidth / canvas.width, pageHeight / canvas.height);
          const imgW = canvas.width * ratio;
          const imgH = canvas.height * ratio;
          const offsetX = (pageWidth - imgW) / 2;
          const offsetY = (pageHeight - imgH) / 2;

          if (!first) pdf.addPage();
          pdf.addImage(imgData, 'PNG', offsetX, offsetY, imgW, imgH, '', 'FAST');
          first = false;
        }
      } else {
        // Fallback: una sola captura larga (puede cortar imágenes)
        const canvas = await html2canvas(container, getHtml2CanvasConfig(scale));
        if (!canvas) throw new Error('No se pudo generar el canvas del documento');

        const imgData = canvas.toDataURL('image/png', quality);
        if (!imgData || imgData === 'data:,') throw new Error('No se pudieron obtener los datos de la imagen');

        const imgWidth = pageWidth;
        const imgHeight = (canvas.height * pageWidth) / canvas.width;
        let position = 0;
        let remainingHeight = imgHeight;

        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, '', 'FAST');
        while (remainingHeight > pageHeight) {
          remainingHeight -= pageHeight;
          position = remainingHeight - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, '', 'FAST');
        }
      }

      setProgress(90);

      // ✅ Intentar guardar usando File System Access API
      const blob = pdf.output('blob');
      const projectFolder = options.projectFolder || ConfigManager.getRuta();
      
      if (ConfigManager.isUsingFileSystemAPI()) {
        const saved = await FileSystemStorage.saveDocument(blob, filename, projectFolder);
        
        if (saved) {
          setProgress(95);
          
          // Enviar a webhook si está configurado
          if (WebhookApi.hasWebhook()) {
            await WebhookApi.uploadDocument({
              file: blob,
              filename,
              projectName: projectFolder,
              type: 'pdf'
            });
          }
          
          setProgress(100);
          toast({
            title: 'PDF guardado exitosamente',
            description: `El archivo "${filename}" se guardó en docs generated/${projectFolder}/`,
          });
          return true;
        } else {
          // Si falla, usar método tradicional
          console.warn('Guardado automático falló, usando descarga tradicional');
        }
      }
      
      // Fallback: método tradicional de descarga
      pdf.save(filename);
      
      // Enviar a webhook si está configurado
      if (WebhookApi.hasWebhook()) {
        await WebhookApi.uploadDocument({
          file: blob,
          filename,
          projectName: projectFolder,
          type: 'pdf'
        });
      }

      setProgress(100);

      toast({
        title: 'PDF generado exitosamente',
        description: `El archivo "${filename}" se ha descargado correctamente.`,
      });

      return true;

    } catch (error) {
      console.error('Error al generar PDF:', error);
      
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Error desconocido al generar el PDF';

      toast({
        title: 'Error al generar PDF',
        description: errorMessage,
        variant: 'destructive',
      });

      return false;
    } finally {
      setIsGenerating(false);
      setProgress(0);
    }
  }, []);

  // ✅ Función para imprimir documento
  const printDocument = useCallback((elementRef: React.RefObject<HTMLElement>) => {
    try {
      if (!elementRef.current) {
        toast({
          title: 'Error',
          description: 'No se encontró el elemento para imprimir',
          variant: 'destructive',
        });
        return;
      }

      // ✅ Crear ventana de impresión
      const printWindow = window.open('', '_blank');
      
      if (!printWindow) {
        toast({
          title: 'Error',
          description: 'No se pudo abrir la ventana de impresión. Verifique que los popups estén permitidos.',
          variant: 'destructive',
        });
        return;
      }

      // ✅ Clonar contenido para impresión
      const printContent = elementRef.current.cloneNode(true) as HTMLElement;
      
      // ✅ Crear documento HTML para impresión
      const printHTML = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Imprimir Documento</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 20px;
              background: white;
            }
            .signature-canvas {
              border: 1px solid #ccc;
              background: white;
            }
            @media print {
              body { margin: 0; }
              .no-print { display: none !important; }
            }
          </style>
        </head>
        <body>
          ${printContent.outerHTML}
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              };
            };
          </script>
        </body>
        </html>
      `;

      printWindow.document.write(printHTML);
      printWindow.document.close();

    } catch (error) {
      console.error('Error al imprimir:', error);
      toast({
        title: 'Error al imprimir',
        description: 'No se pudo iniciar la impresión del documento.',
        variant: 'destructive',
      });
    }
  }, []);

  // ✅ Función para generar PDF y DOCX simultáneamente
  const generateDualDocument = useCallback(async (
    elementRef: React.RefObject<HTMLElement>,
    options: GenerateDualOptions
  ): Promise<boolean> => {
    const {
      filename = `documento-${new Date().toISOString().split('T')[0]}`,
      inspectionData,
      signatureName,
      logoUrl,
      projectFolder,
      signatureDataUrl
    } = options;

    try {
      setIsGenerating(true);
      setProgress(5);

      // Generar nombre base sin extensión
      const baseFilename = filename.replace(/\.(pdf|docx)$/i, '');
      const pdfFilename = filename.endsWith('.pdf') ? filename : `${baseFilename}.pdf`;
      const docxFilename = baseFilename.replace('.Informe', '') + '.Informe.docx';

      // 1. Generar DOCX primero (más rápido)
      setProgress(20);
      toast({
        title: 'Generando documentos...',
        description: 'Creando documento DOCX',
      });

      await generateDocx(
        inspectionData,
        signatureName,
        logoUrl,
        projectFolder,
        signatureDataUrl,
        docxFilename
      );

      setProgress(60);

      // 2. Generar PDF
      toast({
        title: 'Generando documentos...',
        description: 'Creando documento PDF',
      });

      const success = await generatePDF(elementRef, {
        filename: pdfFilename,
        projectFolder
      });

      if (success) {
        setProgress(100);
        toast({
          title: 'Documentos generados exitosamente',
          description: `Se han creado los archivos PDF y DOCX`,
        });
        return true;
      }

      return false;

    } catch (error) {
      console.error('Error al generar documentos:', error);
      
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Error desconocido al generar los documentos';

      toast({
        title: 'Error al generar documentos',
        description: errorMessage,
        variant: 'destructive',
      });

      return false;
    } finally {
      setIsGenerating(false);
      setProgress(0);
    }
  }, [generatePDF]);

  return {
    isGenerating,
    progress,
    generatePDF,
    generateDualDocument,
    printDocument,
  };
};