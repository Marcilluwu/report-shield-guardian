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

interface Worker {
  id: string;
  name: string;
  dni: string;
  category: string;
  company: string;
}

interface EPIItem {
  id: string;
  name: string;
  checked: boolean;
}

interface PhotoWithComment {
  id: string;
  file: File;
  comment: string;
  url: string;
}

interface InspectionData {
  inspector: {
    name: string;
    email: string;
  };
  work: {
    name: string;
    location: string;
    promotingCompany: string;
  };
  workers: Worker[];
  episReviewed: EPIItem[];
  workEnvironment: {
    photos: PhotoWithComment[];
  };
  toolsStatus: {
    photos: PhotoWithComment[];
  };
  vanStatus: {
    licensePlate: string;
    photos: PhotoWithComment[];
  };
  generalObservations: string;
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
      if (!data || !data.inspector?.name) {
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
      const fileName = `reporte-inspeccion-${new Date().toISOString().split('T')[0]}-${Date.now()}.pdf`;
      
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
          <div ref={pdfContentRef} className="space-y-8">
            {/* Header del reporte */}
            <div className="text-center border-b-2 border-gray-800 pb-6">
              <h1 className="text-4xl font-bold text-gray-800 mb-4">
                ACTA DE INSPECCIÓN DE SEGURIDAD
              </h1>
              <div className="text-lg text-gray-700">
                <p className="mb-2"><strong>FECHA INSPECCIÓN:</strong> {new Date().toLocaleDateString('es-ES')}</p>
              </div>
            </div>

            {/* Información del proyecto */}
            <div className="space-y-4 text-base">
              <div>
                <p><strong>PROMOTOR:</strong> {data.work.promotingCompany}</p>
              </div>
              <div>
                <p><strong>PROYECTO:</strong> {data.work.name}</p>
              </div>
              <div>
                <p><strong>EMPLAZAMIENTO:</strong> {data.work.location}</p>
              </div>
              <div>
                <p><strong>INSPECTOR:</strong> {data.inspector.name}</p>
              </div>
              <div>
                <p><strong>EMAIL:</strong> {data.inspector.email}</p>
              </div>
            </div>

            {/* Participantes */}
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-4 border-b border-gray-400 pb-2">PARTICIPANTES</h2>
              <div className="space-y-3">
                <div>
                  <p><strong>INSPECTOR DE SEGURIDAD:</strong> {data.inspector.name}</p>
                </div>
                {data.workers.map((worker, index) => (
                  <div key={index}>
                    <p><strong>{worker.category.toUpperCase()}:</strong> {worker.name}, {worker.company}</p>
                    <p className="text-sm text-gray-600 ml-6">DNI: {worker.dni}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Resumen de la inspección */}
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-4 border-b border-gray-400 pb-2">RESUMEN DE LA INSPECCIÓN</h2>
              <p className="mb-4 text-base">Se levanta acta de la inspección de seguridad realizada en la fecha indicada.</p>
              
              {/* Tabla de EPIs */}
              <table className="w-full border-collapse border border-gray-400 mb-6">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-400 px-3 py-2 text-left font-bold">Código</th>
                    <th className="border border-gray-400 px-3 py-2 text-left font-bold">EPI/Elemento</th>
                    <th className="border border-gray-400 px-3 py-2 text-left font-bold">Estado</th>
                    <th className="border border-gray-400 px-3 py-2 text-left font-bold">Responsable</th>
                  </tr>
                </thead>
                <tbody>
                  {data.episReviewed.map((epi, index) => (
                    <tr key={index}>
                      <td className="border border-gray-400 px-3 py-2">{String(index + 1).padStart(2, '0')}</td>
                      <td className="border border-gray-400 px-3 py-2">{epi.name}</td>
                      <td className="border border-gray-400 px-3 py-2">{epi.checked ? 'Correcto' : 'Deficiente'}</td>
                      <td className="border border-gray-400 px-3 py-2">Inspector</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Desarrollo de la inspección */}
            {[...data.workEnvironment.photos, ...data.toolsStatus.photos, ...data.vanStatus.photos].length > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-4 border-b border-gray-400 pb-2">DESARROLLO DE LA INSPECCIÓN</h2>
                <div className="space-y-6">
                  {[...data.workEnvironment.photos, ...data.toolsStatus.photos, ...data.vanStatus.photos].map((photo, index) => (
                    <div key={index} className="space-y-3">
                      <h3 className="text-xl font-bold text-gray-800">
                        {String(index + 1).padStart(2, '0')}.{String(index + 1).padStart(2, '0')}
                      </h3>
                      <p className="text-base">{photo.comment}</p>
                      <div className="flex justify-center">
                        <img 
                          src={photo.url} 
                          alt={`Inspección ${index + 1}`}
                          className="max-w-md max-h-64 object-contain border border-gray-300"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Asuntos pendientes */}
            {data.generalObservations && (
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-4 border-b border-gray-400 pb-2">ASUNTOS PENDIENTES</h2>
                <table className="w-full border-collapse border border-gray-400">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-400 px-3 py-2 text-left font-bold">Código</th>
                      <th className="border border-gray-400 px-3 py-2 text-left font-bold">Asunto</th>
                      <th className="border border-gray-400 px-3 py-2 text-left font-bold">Estado</th>
                      <th className="border border-gray-400 px-3 py-2 text-left font-bold">Responsable</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-gray-400 px-3 py-2">01</td>
                      <td className="border border-gray-400 px-3 py-2">{data.generalObservations}</td>
                      <td className="border border-gray-400 px-3 py-2">Pendiente</td>
                      <td className="border border-gray-400 px-3 py-2">Inspector</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* Área de firma */}
            <div className="border-t-2 border-gray-800 pt-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b border-gray-400 pb-2">FIRMA DE LOS PARTICIPANTES</h2>
              
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

              {/* Tabla de firmas */}
              <div className="mt-8">
                <table className="w-full border-collapse border border-gray-400">
                  <thead>
                    <tr>
                      <th className="border border-gray-400 px-4 py-8 w-1/2 text-center font-bold">El Inspector de Seguridad</th>
                      <th className="border border-gray-400 px-4 py-8 w-1/2 text-center font-bold">El Constructor</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-gray-400 px-4 py-8 text-center font-bold">La Dirección de Obra</td>
                      <td className="border border-gray-400 px-4 py-8 text-center font-bold">La Propiedad</td>
                    </tr>
                  </tbody>
                </table>
                <div className="mt-4 text-center">
                  <p className="text-sm text-gray-600">
                    Firma digital del inspector: {new Date().toLocaleDateString('es-ES')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};