// hooks/usePDFGenerator.ts
// ✅ Hook personalizado para generar PDFs de manera robusta

import { useState, useCallback, useRef } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { toast } from '@/hooks/use-toast';

interface PDFGenerationOptions {
  filename?: string;
  quality?: number;
  scale?: number;
}

interface UsePDFGeneratorReturn {
  isGenerating: boolean;
  progress: number;
  generatePDF: (elementRef: React.RefObject<HTMLElement>, options?: PDFGenerationOptions) => Promise<boolean>;
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

      // ✅ Guardar el PDF
      pdf.save(filename);

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

  return {
    isGenerating,
    progress,
    generatePDF,
    printDocument,
  };
};