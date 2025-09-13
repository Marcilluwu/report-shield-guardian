import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Download, FileText, PenTool } from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { toast } from '@/hooks/use-toast';

interface Worker {
  id: string;
  name: string;
  dni: string;
  category: string;
  company: string;
}

interface PhotoWithComment {
  id: string;
  file: File;
  comment: string;
  url: string;
}

interface EPIItem {
  id: string;
  name: string;
  checked: boolean;
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
  inspectionData: InspectionData;
  onBack: () => void;
}

export const InspectionPDFPreview: React.FC<InspectionPDFPreviewProps> = ({
  inspectionData,
  onBack
}) => {
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [signatureDataURL, setSignatureDataURL] = useState<string>('');
  const signatureRef = useRef<SignatureCanvas>(null);
  const pdfContentRef = useRef<HTMLDivElement>(null);

  const clearSignature = () => {
    if (signatureRef.current) {
      try {
        signatureRef.current.clear();
        toast({ title: 'Firma eliminada' });
      } catch (error) {
        console.error('Error clearing signature:', error);
      }
    }
  };

  const saveSignature = () => {
    if (signatureRef.current) {
      try {
        if (signatureRef.current.isEmpty()) {
          toast({ title: 'Error', description: 'Por favor, agregue su firma antes de guardar', variant: 'destructive' });
          return;
        }
        
        const dataURL = signatureRef.current.getTrimmedCanvas().toDataURL('image/png');
        setSignatureDataURL(dataURL);
        setShowSignaturePad(false);
        toast({ title: 'Firma guardada correctamente' });
      } catch (error) {
        console.error('Error saving signature:', error);
        toast({ title: 'Error', description: 'No se pudo guardar la firma', variant: 'destructive' });
      }
    }
  };

  const generatePDF = async () => {
    if (!pdfContentRef.current) {
      toast({ title: 'Error', description: 'No se encontró el contenido para generar PDF', variant: 'destructive' });
      return;
    }

    try {
      toast({ title: 'Generando PDF...', description: 'Por favor espere' });
      
      const canvas = await html2canvas(pdfContentRef.current, {
        scale: 1.5,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        height: pdfContentRef.current.scrollHeight,
        width: pdfContentRef.current.scrollWidth
      });

      const imgData = canvas.toDataURL('image/png', 0.8);
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      // Calculate image dimensions to fit PDF
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth * 72/96, pdfHeight / imgHeight * 72/96);
      
      const scaledWidth = imgWidth * ratio;
      const scaledHeight = imgHeight * ratio;
      
      const x = (pdfWidth - scaledWidth) / 2;
      const y = 10; // Small margin from top

      pdf.addImage(imgData, 'PNG', x, y, scaledWidth, scaledHeight);
      
      const fileName = `Acta_Inspeccion_${inspectionData.work.name || 'Obra'}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
      
      toast({ title: 'PDF generado correctamente', description: `Archivo descargado: ${fileName}` });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({ title: 'Error al generar PDF', description: 'Verifique que todos los campos estén completos', variant: 'destructive' });
    }
  };

  const getCurrentDate = () => {
    return new Date().toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getActNumber = () => {
    return `ACT-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver al Formulario
          </Button>
          <div className="flex gap-2">
            <Button 
              variant="outline"
              onClick={() => {
                console.log('Signature button clicked');
                setShowSignaturePad(true);
              }}
            >
              <PenTool className="h-4 w-4 mr-2" />
              {signatureDataURL ? 'Cambiar Firma' : 'Firmar Documento'}
            </Button>
            <Button 
              onClick={() => {
                console.log('PDF generation button clicked');
                generatePDF();
              }} 
              className="bg-primary"
            >
              <Download className="h-4 w-4 mr-2" />
              Descargar PDF
            </Button>
          </div>
        </div>

        {/* Signature Modal */}
        {showSignaturePad && (
          <Card className="p-6 border-2 border-primary">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-center">Firma Digital</h3>
              <div className="border-2 border-dashed border-muted-foreground rounded-lg">
                <SignatureCanvas
                  ref={signatureRef}
                  canvasProps={{
                    width: 500,
                    height: 200,
                    className: 'signature-canvas border rounded',
                    style: { 
                      border: '2px solid #e2e8f0',
                      borderRadius: '8px',
                      cursor: 'crosshair'
                    }
                  }}
                  backgroundColor="rgb(255,255,255)"
                  penColor="rgb(0,0,0)"
                />
              </div>
              <div className="flex justify-between">
                <Button variant="outline" onClick={clearSignature}>
                  Limpiar
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setShowSignaturePad(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={saveSignature}>
                    Guardar Firma
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* PDF Preview */}
        <Card className="p-6">
          <div ref={pdfContentRef} className="bg-white text-black" style={{ fontFamily: 'Arial, sans-serif' }}>
            {/* Header */}
            <div className="flex justify-between items-start mb-4">
              <div className="w-24 h-12 bg-gray-100 border border-dashed border-gray-400 flex items-center justify-center text-xs text-gray-600">
                LOGO EMPRESA
              </div>
              <div className="text-right text-xs font-bold">
                <p>Fecha: {getCurrentDate()}</p>
                <p>Nº Acta: {getActNumber()}</p>
              </div>
            </div>

            {/* Title */}
            <div className="text-xl font-bold text-green-700 mb-6">
              ACTA DE INSPECCIÓN DE SEGURIDAD
            </div>

            {/* Inspector Data */}
            <table className="w-full border-collapse border border-gray-300 mb-4 text-xs">
              <tr>
                <th className="bg-green-700 text-white p-1 border border-gray-300 text-left">INSPECTOR RESPONSABLE</th>
                <th className="bg-green-700 text-white p-1 border border-gray-300 text-left">EMAIL</th>
                <th className="bg-green-700 text-white p-1 border border-gray-300 text-left">FECHA INSPECCIÓN</th>
              </tr>
              <tr>
                <td className="bg-gray-50 p-1 border border-gray-300">{inspectionData.inspector.name}</td>
                <td className="bg-gray-50 p-1 border border-gray-300">{inspectionData.inspector.email}</td>
                <td className="bg-gray-50 p-1 border border-gray-300">{getCurrentDate()}</td>
              </tr>
            </table>

            {/* Work Data */}
            <table className="w-full border-collapse border border-gray-300 mb-4 text-xs">
              <tr>
                <th className="bg-green-700 text-white p-1 border border-gray-300 text-left">OBRA</th>
                <th className="bg-green-700 text-white p-1 border border-gray-300 text-left">UBICACIÓN</th>
                <th className="bg-green-700 text-white p-1 border border-gray-300 text-left">EMPRESA PROMOTORA</th>
              </tr>
              <tr>
                <td className="bg-gray-50 p-1 border border-gray-300">{inspectionData.work.name}</td>
                <td className="bg-gray-50 p-1 border border-gray-300">{inspectionData.work.location}</td>
                <td className="bg-gray-50 p-1 border border-gray-300">{inspectionData.work.promotingCompany}</td>
              </tr>
            </table>

            {/* Workers */}
            <div className="w-full bg-gray-100 text-center text-xs font-bold py-1 mb-2">
              OPERARIOS EN LA OBRA
            </div>
            <table className="w-full border-collapse border border-gray-300 mb-4 text-xs">
              <tr>
                <th className="bg-green-700 text-white p-1 border border-gray-300 text-left">NOMBRE COMPLETO</th>
                <th className="bg-green-700 text-white p-1 border border-gray-300 text-left">DNI</th>
                <th className="bg-green-700 text-white p-1 border border-gray-300 text-left">CATEGORÍA</th>
                <th className="bg-green-700 text-white p-1 border border-gray-300 text-left">EMPRESA</th>
              </tr>
              {inspectionData.workers.map((worker, index) => (
                <tr key={index}>
                  <td className="bg-gray-50 p-1 border border-gray-300">{worker.name}</td>
                  <td className="bg-gray-50 p-1 border border-gray-300">{worker.dni}</td>
                  <td className="bg-gray-50 p-1 border border-gray-300">{worker.category}</td>
                  <td className="bg-gray-50 p-1 border border-gray-300">{worker.company}</td>
                </tr>
              ))}
            </table>

            {/* EPIs - Dynamic from photos */}
            <div className="w-full bg-gray-100 text-center text-xs font-bold py-1 mb-2">
              EQUIPOS DE PROTECCIÓN INDIVIDUAL REVISADOS
            </div>
            <table className="w-full border-collapse border border-gray-300 mb-4 text-xs">
              <tr>
                <th className="bg-green-700 text-white p-1 border border-gray-300 text-left">TIPO DE EPI</th>
                <th className="bg-green-700 text-white p-1 border border-gray-300 text-left">REVISADO</th>
                <th className="bg-green-700 text-white p-1 border border-gray-300 text-left">ESTADO</th>
              </tr>
              {inspectionData.episReviewed.map((epi, index) => (
                <tr key={index}>
                  <td className="bg-gray-50 p-1 border border-gray-300">{epi.name}</td>
                  <td className="bg-gray-50 p-1 border border-gray-300">{epi.checked ? 'SÍ' : 'NO'}</td>
                  <td className="bg-gray-50 p-1 border border-gray-300">{epi.checked ? 'Revisado correctamente' : 'No revisado'}</td>
                </tr>
              ))}
            </table>

            {/* Work Environment - Dynamic from photo comments */}
            <div className="w-full bg-gray-100 text-center text-xs font-bold py-1 mb-2">
              ENTORNO DE LA OBRA
            </div>
            <div className="bg-white border border-black p-2 mb-4 text-xs">
              <p><strong>Fotografías adjuntas:</strong> {inspectionData.workEnvironment.photos.length}</p>
              {inspectionData.workEnvironment.photos.length > 0 && (
                <>
                  <p><strong>Aspectos inspeccionados:</strong></p>
                  {inspectionData.workEnvironment.photos.map((photo, index) => (
                    <p key={index} className="ml-2">• {photo.comment || `Aspecto ${index + 1}: Sin descripción`}</p>
                  ))}
                </>
              )}
            </div>

            {/* Tools Status - Dynamic from photo comments */}
            <div className="w-full bg-gray-100 text-center text-xs font-bold py-1 mb-2">
              ESTADO DE HERRAMIENTAS
            </div>
            <div className="bg-white border border-black p-2 mb-4 text-xs">
              <p><strong>Fotografías adjuntas:</strong> {inspectionData.toolsStatus.photos.length}</p>
              {inspectionData.toolsStatus.photos.length > 0 && (
                <>
                  <p><strong>Herramientas inspeccionadas:</strong></p>
                  {inspectionData.toolsStatus.photos.map((photo, index) => (
                    <p key={index} className="ml-2">• {photo.comment || `Herramienta ${index + 1}: Sin descripción`}</p>
                  ))}
                </>
              )}
            </div>

            {/* Van Status - Dynamic from photo comments */}
            <div className="w-full bg-gray-100 text-center text-xs font-bold py-1 mb-2">
              ESTADO DE LA FURGONETA
            </div>
            <table className="w-full border-collapse border border-gray-300 mb-2 text-xs">
              <tr>
                <th className="bg-green-700 text-white p-1 border border-gray-300 text-left">MATRÍCULA</th>
                <td className="bg-gray-50 p-1 border border-gray-300">{inspectionData.vanStatus.licensePlate}</td>
              </tr>
            </table>
            
            {/* Generate dynamic inspection items from photo comments */}
            {inspectionData.vanStatus.photos.length > 0 && (
              <table className="w-full border-collapse border border-gray-300 mb-2 text-xs">
                <tr>
                  <th className="bg-green-700 text-white p-1 border border-gray-300 text-left">ASPECTO INSPECCIONADO</th>
                  <th className="bg-green-700 text-white p-1 border border-gray-300 text-left">OBSERVACIONES</th>
                </tr>
                {inspectionData.vanStatus.photos.map((photo, index) => (
                  <tr key={index}>
                    <td className="bg-gray-50 p-1 border border-gray-300">{photo.comment ? photo.comment.split(':')[0] || `Inspección ${index + 1}` : `Inspección ${index + 1}`}</td>
                    <td className="bg-gray-50 p-1 border border-gray-300">{photo.comment || 'Sin observaciones'}</td>
                  </tr>
                ))}
              </table>
            )}
            
            <div className="bg-white border border-black p-2 mb-4 text-xs">
              <p><strong>Fotografías adjuntas:</strong> {inspectionData.vanStatus.photos.length}</p>
              <p><strong>Comentarios sobre fotografías:</strong></p>
              {inspectionData.vanStatus.photos.map((photo, index) => (
                <p key={index} className="ml-2">• {photo.comment || 'Sin comentario'}</p>
              ))}
            </div>

            {/* General Observations */}
            <div className="text-xs font-bold mb-2">
              OBSERVACIONES GENERALES:
            </div>
            <div className="w-full h-32 bg-white border border-black p-2 mb-6 text-xs">
              {inspectionData.generalObservations}
            </div>

            {/* Signature */}
            <div className="flex items-end justify-start mt-8">
              <div className="w-64">
                <div className="w-full h-1 bg-black mb-1"></div>
                <div className="text-xs font-bold">
                  <div>Firma del Inspector:</div>
                  <div>{inspectionData.inspector.name}</div>
                </div>
                {signatureDataURL && (
                  <div className="mt-2">
                    <img src={signatureDataURL} alt="Firma" className="max-w-full h-16 object-contain" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};