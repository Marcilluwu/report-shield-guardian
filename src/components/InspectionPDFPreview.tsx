import React, { useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Printer } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import SignatureCanvas from 'react-signature-canvas';
// ✅ Importar el tipo correctamente
import type { default as SignatureCanvasType } from 'react-signature-canvas';
import { toast } from '@/hooks/use-toast';

interface InspectionData {
  date: string;
  inspector: string;
  location: string;
  findings: string[];
  recommendations: string[];
  priority: 'low' | 'medium' | 'high';
}

interface InspectionPDFPreviewProps {
  data: InspectionData;
  onClose: () => void;
}

export const InspectionPDFPreview: React.FC<InspectionPDFPreviewProps> = ({
  data,
  onClose
}) => {
  // ✅ Tipado correcto de las referencias
  const pdfContentRef = useRef<HTMLDivElement | null>(null);
  const signatureRef = useRef<SignatureCanvasType | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [signatureData, setSignatureData] = useState<string>('');

  // ✅ Función mejorada para limpiar la firma
  const clearSignature = () => {
    try {
      if (signatureRef.current) {
        signatureRef.current.clear();
        setSignatureData('');
        toast({
          title: 'Firma limpiada',
          description: 'La firma ha sido eliminada correctamente.'
        });
      }
    } catch (error) {
      console.error('Error al limpiar la firma:', error);
      toast({
        title: 'Error',
        description: 'No se pudo limpiar la firma.',
        variant: 'destructive'
      });
    }
  };

  // ✅ Función mejorada para guardar la firma
  const saveSignature = () => {
    try {
      if (signatureRef.current && !signatureRef.current.isEmpty()) {
        const dataURL = signatureRef.current.toDataURL();
        setSignatureData(dataURL);
        toast({
          title: 'Firma guardada',
          description: 'La firma se ha guardado correctamente.'
        });
      } else {
        toast({
          title: 'Advertencia',
          description: 'Por favor, dibuje su firma antes de guardar.',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error al guardar la firma:', error);
      toast({
        title: 'Error',
        description: 'No se pudo guardar la firma.',
        variant: 'destructive'
      });
    }
  };

  // ✅ Función mejorada para generar PDF con mejores validaciones
  const generatePDF = async () => {
    try {
      setIsGenerating(true);

      // ✅ Validación mejorada con return
      if (!pdfContentRef.current) {
        toast({
          title: 'Error',
          description: 'No se encontró el contenido para generar PDF',
          variant: 'destructive'
        });
        return; // ← Return agregado
      }

      // ✅ Validar que hay datos del formulario
      if (!data || !data.date || !data.inspector) {
        toast({
          title: 'Error',
          description: 'Faltan datos requeridos para generar el PDF',
          variant: 'destructive'
        });
        return;
      }

      // ✅ Validar que hay firma
      if (!signatureData) {
        toast({
          title: 'Error',
          description: 'Por favor, agregue su firma antes de generar el PDF',
          variant: 'destructive'
        });
        return;
      }

      // ✅ Configuración optimizada de html2canvas
      const canvas = await html2canvas(pdfContentRef.current, {
        scale: 2, // Reducido de 1.5 a 2 para mejor calidad
        useCORS: true,
        allowTaint: false, // Cambiado a false para evitar problemas
        backgroundColor: '#ffffff',
        logging: false,
        removeContainer: true, // Agregado para limpiar después
        imageTimeout: 0, // Agregado para evitar timeouts
        // Removido height y width para usar valores automáticos
      });

      // ✅ Validar que el canvas se generó correctamente
      if (!canvas) {
        throw new Error('No se pudo generar el canvas');
      }

      const imgData = canvas.toDataURL('image/png', 1.0);
      
      // ✅ Crear PDF con manejo de errores mejorado
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      // ✅ Calcular dimensiones para ajustar la imagen
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 295; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      let position = 0;

      // ✅ Agregar la imagen al PDF
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // ✅ Manejar múltiples páginas si es necesario
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // ✅ Generar nombre de archivo único
      const fileName = `reporte-inspeccion-${data.date}-${Date.now()}.pdf`;
      
      pdf.save(fileName);

      toast({
        title: 'PDF generado',
        description: `El archivo ${fileName} se ha descargado correctamente.`,
      });

    } catch (error) {
      console.error('Error al generar PDF:', error);
      toast({
        title: 'Error al generar PDF',
        description: error instanceof Error ? error.message : 'Error desconocido al generar el PDF',
        variant: 'destructive'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // ✅ Función para imprimir con validaciones
  const handlePrint = () => {
    try {
      if (!signatureData) {
        toast({
          title: 'Error',
          description: 'Por favor, agregue su firma antes de imprimir',
          variant: 'destructive'
        });
        return;
      }
      window.print();
    } catch (error) {
      console.error('Error al imprimir:', error);
      toast({
        title: 'Error',
        description: 'No se pudo iniciar la impresión',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Controles de acción */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Vista previa del Reporte</h2>
        <div className="flex gap-2">
          <Button 
            onClick={handlePrint} 
            variant="outline"
            disabled={!signatureData}
          >
            <Printer className="w-4 h-4 mr-2" />
            Imprimir
          </Button>
          <Button 
            onClick={generatePDF} 
            disabled={isGenerating || !signatureData}
            className="bg-primary hover:bg-primary/90"
          >
            <Download className="w-4 h-4 mr-2" />
            {isGenerating ? 'Generando...' : 'Descargar PDF'}
          </Button>
          <Button onClick={onClose} variant="outline">
            Cerrar
          </Button>
        </div>
      </div>

      {/* Contenido del PDF */}
      <Card>
        <CardContent className="p-8">
          <div ref={pdfContentRef} className="space-y-6">
            {/* Header del reporte */}
            <div className="text-center border-b pb-4">
              <h1 className="text-3xl font-bold text-gray-800">
                REPORTE DE INSPECCIÓN
              </h1>
              <p className="text-gray-600 mt-2">
                Fecha: {new Date(data.date).toLocaleDateString('es-ES')}
              </p>
            </div>

            {/* Información básica */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-lg mb-2">Inspector:</h3>
                <p className="text-gray-700">{data.inspector}</p>
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">Ubicación:</h3>
                <p className="text-gray-700">{data.location}</p>
              </div>
            </div>

            {/* Hallazgos */}
            <div>
              <h3 className="font-semibold text-lg mb-3">Hallazgos:</h3>
              <ul className="list-disc list-inside space-y-2">
                {data.findings?.map((finding, index) => (
                  <li key={index} className="text-gray-700">{finding}</li>
                ))}
              </ul>
            </div>

            {/* Recomendaciones */}
            <div>
              <h3 className="font-semibold text-lg mb-3">Recomendaciones:</h3>
              <ul className="list-disc list-inside space-y-2">
                {data.recommendations?.map((rec, index) => (
                  <li key={index} className="text-gray-700">{rec}</li>
                ))}
              </ul>
            </div>

            {/* Prioridad */}
            <div>
              <h3 className="font-semibold text-lg mb-2">Prioridad:</h3>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                data.priority === 'high' ? 'bg-red-100 text-red-800' :
                data.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                'bg-green-100 text-green-800'
              }`}>
                {data.priority === 'high' ? 'Alta' : 
                 data.priority === 'medium' ? 'Media' : 'Baja'}
              </span>
            </div>

            {/* Área de firma */}
            <div className="border-t pt-6">
              <h3 className="font-semibold text-lg mb-4">Firma del Inspector:</h3>
              
              {/* Canvas de firma */}
              <div className="border border-gray-300 mb-4">
                <SignatureCanvas
                  ref={signatureRef}
                  canvasProps={{
                    width: 400,
                    height: 150,
                    className: 'signature-canvas'
                  }}
                  backgroundColor="rgba(255,255,255,1)"
                />
              </div>

              {/* Controles de firma */}
              <div className="flex gap-2 mb-4">
                <Button onClick={clearSignature} variant="outline" size="sm">
                  Limpiar Firma
                </Button>
                <Button onClick={saveSignature} variant="outline" size="sm">
                  Guardar Firma
                </Button>
              </div>

              {/* Vista previa de la firma guardada */}
              {signatureData && (
                <div className="mt-4">
                  <p className="text-sm text-gray-600 mb-2">Firma guardada:</p>
                  <img 
                    src={signatureData} 
                    alt="Firma del inspector" 
                    className="border border-gray-300 max-w-xs"
                  />
                </div>
              )}

              <div className="mt-8 text-center">
                <div className="border-t border-gray-400 w-64 mx-auto"></div>
                <p className="text-sm text-gray-600 mt-2">
                  Firma y fecha del inspector
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};