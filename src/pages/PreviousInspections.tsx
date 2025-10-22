import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft, Loader2, FolderOpen, Calendar, FileText } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';

const API_HEADER = { 'psswd': '73862137816273861283dhvhfgdvgf27384rtfgcuyefgc7ewufgqwsdafsdf' };
const BASE_URL = 'https://n8n.n8n.instalia.synology.me/webhook';

interface FolderItem {
  name: string;
  path: string;
  type: string;
}

type Step = 'expedientes' | 'fechas' | 'archivos' | 'pdf';

export const PreviousInspections = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('expedientes');
  const [loading, setLoading] = useState(false);
  
  const [expedientes, setExpedientes] = useState<FolderItem[]>([]);
  const [selectedExpediente, setSelectedExpediente] = useState<FolderItem | null>(null);
  
  const [fechas, setFechas] = useState<FolderItem[]>([]);
  const [selectedFecha, setSelectedFecha] = useState<FolderItem | null>(null);
  
  const [archivos, setArchivos] = useState<FolderItem[]>([]);
  const [selectedArchivo, setSelectedArchivo] = useState<FolderItem | null>(null);
  
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchExpedientes();
  }, []);

  const fetchExpedientes = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/Lista_Carpetas`, {
        headers: API_HEADER,
      });
      
      if (!response.ok) throw new Error('Error al obtener expedientes');
      
      const data = await response.json();
      setExpedientes(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo cargar la lista de expedientes',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchFechas = async (expedientePath: string) => {
    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/Lista_Fechas?path=${encodeURIComponent(expedientePath)}`, {
        headers: API_HEADER,
      });
      
      if (!response.ok) throw new Error('Error al obtener fechas');
      
      const data = await response.json();
      setFechas(data);
      setStep('fechas');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo cargar las fechas del expediente',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchArchivos = async (fechaPath: string) => {
    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/Lista_Fechas?path=${encodeURIComponent(fechaPath)}`, {
        headers: API_HEADER,
      });
      
      if (!response.ok) throw new Error('Error al obtener archivos');
      
      const data = await response.json();
      setArchivos(data);
      setStep('archivos');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo cargar los archivos',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPDF = async (pdfPath: string) => {
    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/pdf_fetch?path=${encodeURIComponent(pdfPath)}`, {
        headers: API_HEADER,
      });
      
      if (!response.ok) throw new Error('Error al obtener PDF');
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
      setStep('pdf');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo cargar el PDF',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExpedienteSelect = (expediente: FolderItem) => {
    setSelectedExpediente(expediente);
    fetchFechas(expediente.path);
  };

  const handleFechaSelect = (fecha: FolderItem) => {
    setSelectedFecha(fecha);
    fetchArchivos(fecha.path);
  };

  const handleArchivoSelect = (archivo: FolderItem) => {
    setSelectedArchivo(archivo);
    fetchPDF(archivo.path);
  };

  const handleBack = () => {
    if (step === 'fechas') {
      setStep('expedientes');
      setSelectedExpediente(null);
      setFechas([]);
    } else if (step === 'archivos') {
      setStep('fechas');
      setSelectedFecha(null);
      setArchivos([]);
    } else if (step === 'pdf') {
      setStep('archivos');
      setSelectedArchivo(null);
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
        setPdfUrl(null);
      }
    } else {
      navigate('/');
    }
  };

  const renderBreadcrumbs = () => {
    const items = ['Expedientes'];
    if (selectedExpediente) items.push(selectedExpediente.name);
    if (selectedFecha) items.push(selectedFecha.name);
    if (selectedArchivo) items.push(selectedArchivo.name);

    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        {items.map((item, index) => (
          <React.Fragment key={index}>
            {index > 0 && <span>/</span>}
            <span className={index === items.length - 1 ? 'text-foreground font-medium' : ''}>
              {item}
            </span>
          </React.Fragment>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-safety-green-light to-background p-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={handleBack}
            className="mb-4"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>

          <h1 className="text-3xl font-bold text-primary mb-2">
            Inspecciones Previas
          </h1>
          {renderBreadcrumbs()}
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {!loading && step === 'expedientes' && (
          <Card className="shadow-safety">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderOpen className="h-5 w-5" />
                Selecciona un Expediente
              </CardTitle>
            </CardHeader>
            <CardContent>
              {expedientes.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No hay expedientes disponibles
                </p>
              ) : (
                <ScrollArea className="h-[500px]">
                  <div className="grid gap-3">
                    {expedientes.map((expediente, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        className="h-auto py-4 justify-start text-left hover:bg-primary/10 hover:border-primary"
                        onClick={() => handleExpedienteSelect(expediente)}
                      >
                        <FolderOpen className="h-5 w-5 mr-3 text-primary" />
                        <span className="font-medium">{expediente.name}</span>
                      </Button>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        )}

        {!loading && step === 'fechas' && (
          <Card className="shadow-safety">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Selecciona una Fecha
              </CardTitle>
            </CardHeader>
            <CardContent>
              {fechas.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No hay fechas disponibles para este expediente
                </p>
              ) : (
                <ScrollArea className="h-[500px]">
                  <div className="grid gap-3">
                    {fechas.map((fecha, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        className="h-auto py-4 justify-start text-left hover:bg-primary/10 hover:border-primary"
                        onClick={() => handleFechaSelect(fecha)}
                      >
                        <Calendar className="h-5 w-5 mr-3 text-primary" />
                        <span className="font-medium">{fecha.name}</span>
                      </Button>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        )}

        {!loading && step === 'archivos' && (
          <Card className="shadow-safety">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Selecciona un Archivo
              </CardTitle>
            </CardHeader>
            <CardContent>
              {archivos.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No hay archivos disponibles para esta fecha
                </p>
              ) : (
                <ScrollArea className="h-[500px]">
                  <div className="grid gap-3">
                    {archivos.map((archivo, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        className="h-auto py-4 justify-start text-left hover:bg-primary/10 hover:border-primary"
                        onClick={() => handleArchivoSelect(archivo)}
                      >
                        <FileText className="h-5 w-5 mr-3 text-primary" />
                        <span className="font-medium">{archivo.name}</span>
                      </Button>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        )}

        {!loading && step === 'pdf' && pdfUrl && (
          <Card className="shadow-safety">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Visualización del PDF
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="w-full h-[700px] border rounded-lg overflow-hidden">
                <iframe
                  src={pdfUrl}
                  className="w-full h-full"
                  title="PDF Viewer"
                />
              </div>
              <div className="mt-4 flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = pdfUrl;
                    link.download = selectedArchivo?.name || 'documento.pdf';
                    link.click();
                  }}
                >
                  Descargar PDF
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
