import React, { useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download, Printer, Settings, FileText } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { usePDFGenerator } from '@/hooks/usePDFgenerator';
import { useSignature } from '@/hooks/useSingature';
import { ConfigManager } from '@/utils/configManager';
import SignatureCanvas from 'react-signature-canvas';

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
  logoUrl?: string;
  selectedFolder?: string;
  onClose: () => void;
}

export const InspectionPDFPreview: React.FC<InspectionPDFPreviewProps> = ({
  data,
  logoUrl,
  selectedFolder,
  onClose
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [signatureName, setSignatureName] = useState(data.inspector.name || '');
  const [configLoaded, setConfigLoaded] = useState(ConfigManager.hasConfig());
  const { generatePDF } = usePDFGenerator();
  const { signatureRef, signatureData, clearSignature, validateSignature, saveSignature } = useSignature();

  // Cargar configuración de ruta
  const handleLoadConfig = async () => {
    try {
      await ConfigManager.loadConfig();
      setConfigLoaded(true);
      toast({
        title: 'Configuración cargada',
        description: `Ruta configurada: ${ConfigManager.getRuta()}`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo cargar la configuración',
        variant: 'destructive'
      });
    }
  };

  // Generar documento PDF
  const generateDocument = async () => {
    try {
      setIsGenerating(true);

      // Validar datos requeridos
      if (!data || !data.inspector?.name) {
        toast({
          title: 'Error',
          description: 'Faltan datos requeridos para generar el documento',
          variant: 'destructive'
        });
        return;
      }

      // Validar nombre para la firma
      if (!signatureName.trim()) {
        toast({
          title: 'Error',
          description: 'Por favor, introduzca el nombre para la firma',
          variant: 'destructive'
        });
        return;
      }

      // Obtener datos de la firma
      if (!signatureData) {
        toast({
          title: 'Error',
          description: 'Por favor, firme el documento antes de generar',
          variant: 'destructive'
        });
        return;
      }

      const folderPrefix = selectedFolder ? `${selectedFolder}_` : '';
      const fileName = `Inspección_${folderPrefix}${new Date().toISOString().split('T')[0]}.pdf`;
      
      // Obtener referencia al contenido del documento
      const contentElement = document.getElementById('pdf-content');
      if (!contentElement) {
        toast({
          title: 'Error',
          description: 'No se pudo encontrar el contenido del documento',
          variant: 'destructive'
        });
        return;
      }

      const elementRef = { current: contentElement };
      const success = await generatePDF(elementRef, { filename: fileName });

      if (success) {
        toast({
          title: 'Documento generado',
          description: `El archivo PDF se ha descargado correctamente`,
        });
      }

    } catch (error) {
      console.error('Error al generar documento:', error);
      toast({
        title: 'Error al generar documento',
        description: error instanceof Error ? error.message : 'Error desconocido al generar el documento',
        variant: 'destructive'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Función para imprimir
  const handlePrint = () => {
    try {
      if (!signatureName.trim()) {
        toast({
          title: 'Error',
          description: 'Por favor, introduzca el nombre para la firma antes de imprimir',
          variant: 'destructive'
        });
        return;
      }
      
      if (!signatureData) {
        toast({
          title: 'Error',
          description: 'Por favor, firme el documento antes de imprimir',
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
          {!configLoaded && (
            <Button 
              onClick={handleLoadConfig} 
              variant="outline"
            >
              <Settings className="w-4 h-4 mr-2" />
              Cargar Config
            </Button>
          )}
          <Button 
            onClick={handlePrint} 
            variant="outline"
            disabled={!signatureName.trim()}
          >
            <Printer className="w-4 h-4 mr-2" />
            Imprimir
          </Button>
          <Button 
            onClick={generateDocument} 
            disabled={isGenerating || !signatureName.trim()}
            className="bg-primary hover:bg-primary/90"
          >
            <FileText className="w-4 h-4 mr-2" />
            {isGenerating ? 'Generando...' : 'Generar PDF'}
          </Button>
          <Button onClick={onClose} variant="outline">
            Cerrar
          </Button>
        </div>
      </div>

      {/* Configuración de firma */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Label htmlFor="signature-name">Nombre para la firma:</Label>
                <Input
                  id="signature-name"
                  value={signatureName}
                  onChange={(e) => setSignatureName(e.target.value)}
                  placeholder="Introduzca el nombre del firmante"
                />
              </div>
              {configLoaded && (
                <div className="text-sm text-muted-foreground">
                  Carpeta: {ConfigManager.getRuta()}
                </div>
              )}
            </div>
            
            {/* Panel de firma digital */}
            <div className="border rounded-lg p-4 bg-muted/50">
              <div className="flex justify-between items-center mb-3">
                <Label>Firma Digital:</Label>
                <div className="flex gap-2">
                  <Button 
                    onClick={saveSignature} 
                    variant="outline" 
                    size="sm"
                  >
                    Guardar Firma
                  </Button>
                  <Button 
                    onClick={clearSignature} 
                    variant="outline" 
                    size="sm"
                  >
                    Limpiar
                  </Button>
                </div>
              </div>
              <div className="border-2 border-dashed border-gray-300 rounded-lg">
                <SignatureCanvas
                  ref={signatureRef}
                  canvasProps={{
                    width: 400,
                    height: 150,
                    className: 'signature-canvas w-full h-full'
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Firme en el área de arriba usando su dedo o ratón, luego haga clic en "Guardar Firma"
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contenido del documento */}
      <Card>
        <CardContent className="p-8">
          <div id="pdf-content" className="space-y-8">
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
                          className="max-w-full h-auto object-contain border border-gray-300"
                          style={{ maxHeight: '500px', width: 'auto' }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}


            {/* Área de firma con firma digital */}
            <div className="border-t-2 border-gray-800 pt-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b border-gray-400 pb-2">FIRMA DE LOS PARTICIPANTES</h2>
              
              <div className="space-y-4">
                <div className="border border-gray-300 p-6 text-center">
                  <p className="text-lg font-bold mb-4">Firma de: {signatureName}</p>
                  <div className="border border-gray-400 w-80 h-20 mx-auto mb-4 bg-white flex items-center justify-center">
                    {signatureData ? (
                      <img 
                        src={signatureData} 
                        alt="Firma digital" 
                        className="max-w-full max-h-full object-contain"
                      />
                    ) : (
                      <span className="text-gray-400 text-sm">Área de firma - Use el panel superior para firmar</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">
                    Fecha: {new Date().toLocaleDateString('es-ES')}
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