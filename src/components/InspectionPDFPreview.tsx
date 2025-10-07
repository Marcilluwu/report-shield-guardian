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

interface VanStatus {
  id: string;
  licensePlate: string;
  photos: PhotoWithComment[];
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
  vans: VanStatus[];
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
          <div id="pdf-content" className="space-y-4">
            <div className="pdf-page space-y-4" style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', lineHeight: '1.4', padding: '15mm' }}>
              {/* Header with logo and green title */}
              <div className="flex items-start gap-4 mb-4">
                {logoUrl && (
                  <div className="flex-shrink-0">
                    <img 
                      src={logoUrl} 
                      alt="Logo empresa" 
                      className="h-16 w-auto object-contain"
                    />
                  </div>
                )}
                <div className="flex-1">
                  <h1 style={{ fontSize: '16px', fontWeight: 'bold', color: '#4a7c59', marginBottom: '2px', lineHeight: '1.3' }}>
                    Acta de Revisión, Pruebas Hidrostáticas y Recargas de Equipos Contraincendios
                  </h1>
                </div>
              </div>

              {/* Information sections - compact */}
              <div style={{ fontSize: '11px', marginBottom: '15px', lineHeight: '1.6' }}>
                <h2 style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '8px', color: '#4a7c59' }}>1. Datos de la inspección</h2>
                <p><strong>Promotor:</strong> {data.work.promotingCompany}</p>
                <p><strong>Proyecto:</strong> {data.work.name}</p>
                <p><strong>Emplazamiento:</strong> {data.work.location}</p>
                <p><strong>Inspector:</strong> {data.inspector.name}</p>
                <p><strong>Email del inspector:</strong> {data.inspector.email}</p>
                <p><strong>Fecha:</strong> {new Date().toLocaleDateString('es-ES')}</p>
              </div>

              {/* Participants */}
              {data.workers.length > 0 && (
                <div className="mb-4">
                  <h2 style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '6px', color: '#333' }}>2. Participantes</h2>
                  <div className="space-y-2">
                    {data.workers.map((worker, index) => (
                      <div key={index} style={{ fontSize: '10px' }}>
                        <strong>Operario {index + 1}:</strong> {worker.name}, {worker.company}, DNI: {worker.dni}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* EPIs section */}
              {data.episReviewed && data.episReviewed.length > 0 && (
                <div className="mb-4">
                  <h2 style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '8px', color: '#4a7c59' }}>3. Resumen de las EPIS inspeccionadas</h2>
                  <div style={{ fontSize: '10px', lineHeight: '1.5' }}>
                    {data.episReviewed.filter(epi => epi.checked).map((epi, index) => (
                      <div key={epi.id} style={{ marginBottom: '4px' }}>
                        • {epi.name}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Work Environment Photos */}
            {data.workEnvironment.photos.length > 0 && (
              <div className="pdf-page" style={{ padding: '15mm' }}>
                <h2 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '12px', color: '#4a7c59' }}>4. Entorno de la Obra</h2>
                {data.workEnvironment.photos.map((photo, index) => (
                  <div key={index} style={{ marginBottom: '15px', pageBreakInside: 'avoid' }}>
                    {photo.comment ? (
                      <p style={{ fontSize: '10px', marginBottom: '6px' }}><strong>{photo.comment}</strong></p>
                    ) : (
                      <p style={{ fontSize: '10px', marginBottom: '6px' }}><strong>Foto {index + 1}:</strong></p>
                    )}
                    <div style={{ textAlign: 'center' }}>
                      <img
                        src={photo.url}
                        alt={`Entorno ${index + 1}`}
                        style={{ maxWidth: '100%', maxHeight: '400px', objectFit: 'contain', border: '1px solid #ddd' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Tools Status Photos */}
            {data.toolsStatus.photos.length > 0 && (
              <div className="pdf-page" style={{ padding: '15mm' }}>
                <h2 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '12px', color: '#4a7c59' }}>5. Estado de las Herramientas</h2>
                {data.toolsStatus.photos.map((photo, index) => (
                  <div key={index} style={{ marginBottom: '15px', pageBreakInside: 'avoid' }}>
                    {photo.comment ? (
                      <p style={{ fontSize: '10px', marginBottom: '6px' }}><strong>{photo.comment}</strong></p>
                    ) : (
                      <p style={{ fontSize: '10px', marginBottom: '6px' }}><strong>Foto {index + 1}:</strong></p>
                    )}
                    <div style={{ textAlign: 'center' }}>
                      <img
                        src={photo.url}
                        alt={`Herramienta ${index + 1}`}
                        style={{ maxWidth: '100%', maxHeight: '400px', objectFit: 'contain', border: '1px solid #ddd' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Vans Status - Grouped by License Plate */}
            {data.vans.length > 0 && data.vans.some(van => van.photos.length > 0) && (
              <div className="pdf-page" style={{ padding: '15mm' }}>
                <h2 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '12px', color: '#4a7c59' }}>6. Estado de las Furgonetas</h2>
                {data.vans.map((van, vanIndex) => (
                  van.photos.length > 0 && (
                    <div key={van.id} style={{ marginBottom: '20px' }}>
                      <h3 style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '8px', color: '#333' }}>
                        Matrícula de la furgoneta {vanIndex + 1}: {van.licensePlate || 'Sin especificar'}
                      </h3>
                      {van.photos.map((photo, photoIndex) => (
                        <div key={photo.id} style={{ marginBottom: '15px', pageBreakInside: 'avoid' }}>
                          {photo.comment ? (
                            <p style={{ fontSize: '10px', marginBottom: '6px' }}><strong>{photo.comment}</strong></p>
                          ) : (
                            <p style={{ fontSize: '10px', marginBottom: '6px' }}><strong>Foto {photoIndex + 1}:</strong></p>
                          )}
                          <div style={{ textAlign: 'center' }}>
                            <img
                              src={photo.url}
                              alt={`Furgoneta ${vanIndex + 1} - Foto ${photoIndex + 1}`}
                              style={{ maxWidth: '100%', maxHeight: '400px', objectFit: 'contain', border: '1px solid #ddd' }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                ))}
              </div>
            )}

            {/* Signature section */}
            <div className="pdf-page" style={{ padding: '15mm', borderTop: '2px solid #4a7c59', paddingTop: '20px' }}>
              <h2 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '15px', color: '#4a7c59' }}>FIRMA DE LOS PARTICIPANTES</h2>
              <div style={{ border: '1px solid #ddd', padding: '20px', textAlign: 'center' }}>
                <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '15px' }}>Firma de: {signatureName}</p>
                <div style={{ border: '1px solid #999', width: '320px', height: '80px', margin: '0 auto 15px', backgroundColor: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {signatureData ? (
                    <img
                      src={signatureData}
                      alt="Firma digital"
                      style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                    />
                  ) : (
                    <span style={{ color: '#999', fontSize: '11px' }}>_______________________</span>
                  )}
                </div>
                <p style={{ fontSize: '10px', color: '#666' }}>Fecha: {new Date().toLocaleDateString('es-ES')}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};