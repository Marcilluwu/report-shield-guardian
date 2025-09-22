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
      const currentDate = new Date().toISOString().split('T')[0];
      const fileName = `Inspección_${folderPrefix}${currentDate}.pdf`;
      
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
              <div className="border-2 border-dashed border-gray-300 rounded-lg flex justify-center">
                <SignatureCanvas
                  ref={signatureRef}
                  canvasProps={{
                    width: 400,
                    height: 150,
                    className: 'signature-canvas border-0'
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
            <div className="pdf-page space-y-8">
            {/* Header with logo and title */}
            <div className="flex items-start justify-between mb-6">
              {logoUrl && (
                <div className="flex-shrink-0">
                  <img 
                    src={logoUrl} 
                    alt="Logo empresa" 
                    className="h-16 w-auto object-contain"
                  />
                </div>
              )}
              <div className="flex-1 text-center">
                <h1 className="text-lg font-bold text-gray-800 mb-2">
                  ACTA DE INSPECCIÓN DE SEGURIDAD Y SALUD LABORAL
                </h1>
                <div className="text-sm text-gray-600">
                  Equipos de Protección Individual y Condiciones de Trabajo
                </div>
              </div>
            </div>

            {/* Document details */}
            <div className="grid grid-cols-3 gap-4 text-sm mb-6 border-b pb-4">
              <div><strong>N° Trabajo:</strong> {Math.floor(Math.random() * 1000) + 1}</div>
              <div><strong>Fecha:</strong> {new Date().toLocaleDateString('es-ES')}</div>
              <div><strong>Inspector:</strong> {data.inspector.name}</div>
              <div><strong>Cliente:</strong> {selectedFolder || 'Sin especificar'}</div>
              <div><strong>Obra:</strong> {data.work.name}</div>
              <div><strong>Ubicación:</strong> {data.work.location}</div>
            </div>

            {/* Main inspection table */}
            <div className="mb-6">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300 text-xs">
                  <thead>
                    <tr className="bg-green-600 text-white">
                      <th className="border border-gray-300 px-2 py-1 text-center">REFERENCIA</th>
                      <th className="border border-gray-300 px-2 py-1 text-center">MARCA/MODELO</th>
                      <th className="border border-gray-300 px-2 py-1 text-center">FECHA DE FABRICACIÓN</th>
                      <th className="border border-gray-300 px-2 py-1 text-center">FECHA PRÓXIMA PRUEBA H.</th>
                      <th className="border border-gray-300 px-2 py-1 text-center">PRESIÓN TRABAJO</th>
                      <th className="border border-gray-300 px-2 py-1 text-center">OBSERVACIONES</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Participants rows */}
                    {data.workers.map((worker, index) => (
                      <tr key={`worker-${index}`} className="even:bg-gray-50">
                        <td className="border border-gray-300 px-2 py-1">{`TRAB-${index + 1}`}</td>
                        <td className="border border-gray-300 px-2 py-1">{worker.name}</td>
                        <td className="border border-gray-300 px-2 py-1">{new Date().toLocaleDateString('es-ES')}</td>
                        <td className="border border-gray-300 px-2 py-1">{new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toLocaleDateString('es-ES')}</td>
                        <td className="border border-gray-300 px-2 py-1">{worker.category}</td>
                        <td className="border border-gray-300 px-2 py-1">REVISIÓN</td>
                      </tr>
                    ))}
                    
                    {/* EPI items rows */}
                    {data.episReviewed.filter(epi => epi.checked).map((epi, index) => (
                      <tr key={`epi-${index}`} className="even:bg-gray-50">
                        <td className="border border-gray-300 px-2 py-1">{`EPI-${index + 1}`}</td>
                        <td className="border border-gray-300 px-2 py-1">{epi.name}</td>
                        <td className="border border-gray-300 px-2 py-1">{new Date().toLocaleDateString('es-ES')}</td>
                        <td className="border border-gray-300 px-2 py-1">{new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toLocaleDateString('es-ES')}</td>
                        <td className="border border-gray-300 px-2 py-1">ESTÁNDAR</td>
                        <td className="border border-gray-300 px-2 py-1">CONFORME</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Summary count */}
            <div className="mb-6">
              <p className="text-sm font-semibold">
                La Presente Acta Consta de {data.workers.length + data.episReviewed.filter(epi => epi.checked).length} ítems
              </p>
            </div>
            {/* Comprobaciones section matching reference format */}
            <div className="mb-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4">Comprobaciones Realizadas en Extintores</h2>
              <div className="grid grid-cols-3 gap-6 text-sm">
                <div>
                  <p className="mb-2"><strong>Dispone de manual de uso según se especifica:</strong></p>
                  <p>Las instrucciones deben especificar como se debe descolgar, quitar seguros o realizar lo que se tenga que hacer para poner en servicio y dirigir el flujo hacia el fuego.</p>
                  <p><strong>¿En accesible?</strong></p>
                  <p>El extintor debe estar ubicado de tal forma que sea fácil su utilización por parte de una persona.</p>
                  <p><strong>¿Se acciona adecuadamente y chorro en buen estado tanto de caudal, de forma directa y con alcance?</strong></p>
                  <p>Este punto es crítico pues debe poder utilizarse cuando se necesite.</p>
                </div>
                <div>
                  <p className="mb-2">Este es el nivel de carga asignado y es el que requiere el extintor para efectuar su cometido correctamente.</p>
                  <p className="mb-2">Esta informaciones de manejo en las que se señala y se recomienda mantener el extintor al revés.</p>
                  <p className="mb-2">Si hay extintores de polvo o nieve, conseguir directamente el movimiento de partículas que se depositarán en el fondo y no en el mecanismo de descarga.</p>
                  <p className="mb-2">Esta información debe estar bien legible al usuario.</p>
                  <p className="mb-2">En los equipos que mantengan las válvulas por accionamiento directo, la palanca de servicio deberá accionarse lentamente. Recuerde que un accionamiento brusco y súbito puede provocar el atasco de la válvula.</p>
                </div>
                <div>
                  <p className="mb-2">Una vez asegurado un lugar seguro y el mecanismo adecuado para el fuego de que se trate.</p>
                  <p className="mb-2">Por el primer aspecto que se examine es el manómetro indicador de presión y chequear que está en zona verde.</p>
                  <p className="mb-2">Se recomienda el sistema de carga con el mecanismo a tope, comprobando que el sistema funciona correctamente.</p>
                  <p className="mb-2">Para los extintores de CO2 que no disponen de manómetro se requerirá el pesado del botellín.</p>
                  <p className="mb-2">Para extintores de tipo ABC se debe comprobar especialmente el estado del alojamiento de polvo, que pueda compactarse y no salir cuando se necesite.</p>
                  <p className="mb-2">Se recordará el sistema de fácil accesibilidad.</p>
                </div>
              </div>
            </div>
            </div>

            {/* Desarrollo de la inspección */}
            {[...data.workEnvironment.photos, ...data.toolsStatus.photos, ...data.vanStatus.photos].length > 0 && (
              <>
                {[...data.workEnvironment.photos, ...data.toolsStatus.photos, ...data.vanStatus.photos].map((photo, index) => (
                  <div key={index} className="pdf-page space-y-6">
                    <h2 className="text-2xl font-bold text-gray-800 mb-4 border-b border-gray-400 pb-2">DESARROLLO DE LA INSPECCIÓN</h2>
                    <div className="space-y-3">
                      <h3 className="text-xl font-bold text-gray-800">
                        {String(index + 1).padStart(2, '0')}.{String(index + 1).padStart(2, '0')}
                      </h3>
                      <p className="text-base">{photo.comment}</p>
                      <div className="flex justify-center">
                        <img
                          src={photo.url}
                          alt={`Inspección ${index + 1}`}
                          className="max-w-full h-auto object-contain border border-gray-300"
                          style={{ maxHeight: '900px', width: 'auto' }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}


            {/* Área de firma con firma digital */}
            <div className="pdf-page border-t-2 border-gray-800 pt-8">
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
                      <span className="text-gray-400 text-sm">_______________________</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">Fecha: {new Date().toLocaleDateString('es-ES')}</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};