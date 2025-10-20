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
  projectFolder?: string;
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

// Función auxiliar para precargar todas las imágenes antes de generar PDF
const preloadImages = async (element: HTMLElement): Promise<boolean> => {
  const images = Array.from(element.querySelectorAll('img'));
  console.log(`Precargando ${images.length} imágenes...`);
  
  let loadedCount = 0;
  let failedCount = 0;

  const imagePromises = images.map((img, index) => {
    return new Promise<void>((resolve) => {
      if (img.complete && img.naturalHeight !== 0) {
        loadedCount++;
        console.log(`Imagen ${index + 1}/${images.length} ya cargada`);
        resolve();
      } else {
        const timeout = setTimeout(() => {
          console.warn(`Timeout cargando imagen ${index + 1}:`, img.src.substring(0, 100));
          failedCount++;
          resolve(); // Resolver de todos modos para no bloquear
        }, 45000); // 45 segundos timeout (más tiempo para móviles)

        img.onload = () => {
          clearTimeout(timeout);
          loadedCount++;
          console.log(`Imagen ${index + 1}/${images.length} cargada correctamente`);
          resolve();
        };
        img.onerror = () => {
          clearTimeout(timeout);
          console.error(`Error cargando imagen ${index + 1}:`, img.src.substring(0, 100));
          failedCount++;
          resolve(); // Resolver de todos modos
        };
        
        // Forzar recarga si la imagen no está completa
        if (!img.complete) {
          const currentSrc = img.src;
          img.src = '';
          img.src = currentSrc;
        }
      }
    });
  });

  await Promise.all(imagePromises);
  
  console.log(`Precarga completada: ${loadedCount} exitosas, ${failedCount} fallidas de ${images.length} totales`);
  
  // Retornar true solo si al menos se cargó la mayoría de las imágenes
  return failedCount < images.length / 2;
};

export const usePDFGenerator = (): UsePDFGeneratorReturn => {
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  
  const getHtml2CanvasConfig = (scale: number = 2) => {
    const isMobile = window.innerWidth < 768;
    const devicePixelRatio = window.devicePixelRatio || 1;
    
    // Ajustar escala según dispositivo
    const adjustedScale = isMobile ? Math.min(scale * 1.2, 2.5) : scale;
    
    return {
      scale: adjustedScale,
      useCORS: true,
      allowTaint: false,
      backgroundColor: '#ffffff',
      logging: false,
      removeContainer: true,
      imageTimeout: 30000, // 30 segundos para móviles lentos
      height: null,
      width: null,
      scrollX: 0,
      scrollY: 0,
      windowWidth: isMobile ? 1024 : window.innerWidth,
      windowHeight: isMobile ? 1440 : window.innerHeight,
      onclone: (clonedDoc: Document) => {
        // Asegurar que todas las imágenes tengan atributos correctos
        const clonedImages = clonedDoc.querySelectorAll('img');
        clonedImages.forEach((img) => {
          img.style.maxWidth = '100%';
          img.style.height = 'auto';
        });
      }
    };
  };

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

      if (!elementRef.current) {
        toast({
          title: 'Error',
          description: 'No se encontró el elemento para generar PDF',
          variant: 'destructive',
        });
        return false;
      }

      setProgress(20);

      // Precargar todas las imágenes primero
      const imagesLoaded = await preloadImages(elementRef.current);
      
      if (!imagesLoaded) {
        toast({
          title: 'Advertencia',
          description: 'Algunas imágenes no se cargaron completamente. El PDF podría tener problemas.',
          variant: 'destructive',
        });
      }
      
      setProgress(30);

      const container = elementRef.current as HTMLElement;
      const pageNodes = container.querySelectorAll('.pdf-page');

      const pdf = new jsPDF({ 
        orientation: 'portrait', 
        unit: 'mm', 
        format: 'a4', 
        compress: true 
      });
      
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      if (pageNodes.length > 0) {
        console.log(`Procesando ${pageNodes.length} páginas del PDF...`);
        
        // Procesar página por página
        let pageIndex = 0;
        for (const node of Array.from(pageNodes)) {
          console.log(`Procesando página ${pageIndex + 1} de ${pageNodes.length}...`);
          setProgress(30 + (pageIndex / pageNodes.length) * 50);
          
          // Esperar un momento antes de procesar cada página (ayuda en móviles)
          if (pageIndex > 0) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          
          try {
            const canvas = await html2canvas(
              node as HTMLElement, 
              getHtml2CanvasConfig(scale)
            );
            
            if (!canvas) {
              console.error(`No se pudo generar el canvas de la página ${pageIndex + 1}`);
              throw new Error(`No se pudo generar el canvas de la página ${pageIndex + 1}`);
            }

            const imgData = canvas.toDataURL('image/jpeg', quality);
            
            if (!imgData || imgData === 'data:,') {
              console.error(`No se pudieron obtener los datos de la imagen de la página ${pageIndex + 1}`);
              throw new Error(`No se pudieron obtener los datos de la imagen de la página ${pageIndex + 1}`);
            }

            const ratio = Math.min(
              pageWidth / canvas.width, 
              pageHeight / canvas.height
            );
            
            const imgW = canvas.width * ratio;
            const imgH = canvas.height * ratio;
            const offsetX = (pageWidth - imgW) / 2;
            const offsetY = (pageHeight - imgH) / 2;

            if (pageIndex > 0) {
              pdf.addPage();
            }
            
            pdf.addImage(imgData, 'JPEG', offsetX, offsetY, imgW, imgH, '', 'FAST');
            console.log(`Página ${pageIndex + 1} procesada correctamente`);
            
            pageIndex++;
          } catch (pageError) {
            console.error(`Error procesando página ${pageIndex + 1}:`, pageError);
            throw new Error(`Error en página ${pageIndex + 1}: ${pageError instanceof Error ? pageError.message : 'Error desconocido'}`);
          }
        }
        
        console.log('Todas las páginas procesadas correctamente');
      }

      setProgress(85);

      const blob = pdf.output('blob');
      const projectFolder = options.projectFolder || ConfigManager.getRuta();
      
      if (ConfigManager.isUsingFileSystemAPI()) {
        const saved = await FileSystemStorage.saveDocument(blob, filename, projectFolder);
        
        if (saved) {
          setProgress(95);
          
          if (WebhookApi.hasWebhook()) {
            try {
              await WebhookApi.uploadDocument({
                file: blob,
                filename,
                projectName: projectFolder,
                type: 'pdf'
              });
            } catch (error) {
              console.error('Error enviando PDF al webhook:', error);
            }
          }
          
          setProgress(100);
          toast({
            title: 'PDF guardado exitosamente',
            description: `El archivo "${filename}" se guardó en docs generated/${projectFolder}/`,
          });
          return true;
        }
      }
      
      // Fallback: descarga tradicional
      pdf.save(filename);
      
      if (WebhookApi.hasWebhook()) {
        try {
          await WebhookApi.uploadDocument({
            file: blob,
            filename,
            projectName: projectFolder,
            type: 'pdf'
          });
        } catch (error) {
          console.error('Error enviando PDF al webhook:', error);
        }
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

      const printWindow = window.open('', '_blank');
      
      if (!printWindow) {
        toast({
          title: 'Error',
          description: 'No se pudo abrir la ventana de impresión. Verifique que los popups estén permitidos.',
          variant: 'destructive',
        });
        return;
      }

      const printContent = elementRef.current.cloneNode(true) as HTMLElement;
      
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

      const baseFilename = filename.replace(/\.(pdf|docx)$/i, '');
      const pdfFilename = filename.endsWith('.pdf') ? filename : `${baseFilename}.pdf`;
      const docxFilename = baseFilename.replace('.Informe', '') + '.Informe.docx';

      setProgress(10);
      toast({
        title: 'Generando documentos...',
        description: 'Creando PDF y DOCX en paralelo',
      });

      // Generar DOCX y PDF en paralelo
      const [docxResult, pdfResult] = await Promise.all([
        generateDocx(
          inspectionData,
          signatureName,
          logoUrl,
          projectFolder,
          signatureDataUrl,
          docxFilename
        ).then(() => {
          console.log('✅ DOCX generado correctamente');
          return true;
        }).catch((error) => {
          console.error('❌ Error generando DOCX:', error);
          return false;
        }),
        
        generatePDF(elementRef, {
          filename: pdfFilename,
          projectFolder
        }).then((success) => {
          console.log(success ? '✅ PDF generado correctamente' : '❌ Error generando PDF');
          return success;
        }).catch((error) => {
          console.error('❌ Error generando PDF:', error);
          return false;
        })
      ]);

      setProgress(100);

      if (docxResult && pdfResult) {
        toast({
          title: 'Documentos generados exitosamente',
          description: `Se han creado los archivos PDF y DOCX`,
        });
        return true;
      } else if (docxResult || pdfResult) {
        toast({
          title: 'Generación parcial',
          description: `Solo se generó ${docxResult ? 'DOCX' : 'PDF'} correctamente`,
          variant: 'destructive',
        });
        return false;
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
