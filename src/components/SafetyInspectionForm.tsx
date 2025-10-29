import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, Eye, Wifi, WifiOff, RefreshCw, Save, Upload, ArrowLeft } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { InspectionPDFPreview } from './InspectionPDFPreview';
import { LogoSelector } from './LogoSelector';
import { FolderManager } from './FolderManager';
import { PhotoUploadSection } from '@/components/photos/PhotoUploadSection';
import { useOfflineForm } from '@/hooks/useOfflineForm';
import { OfflineQueueStatus } from './OfflineQueueStatus';

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

interface SafetyMeasureItem {
  id: string;
  name: string;
  checked: boolean;
}


interface VanStatus {
  id: string;
  licensePlate: string;
  photos: PhotoWithComment[];
}

interface InspectionData {
  expedientNumber: string;
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
  safetyMeasures: SafetyMeasureItem[];
  workEnvironment: {
    photos: PhotoWithComment[];
  };
  toolsStatus: {
    photos: PhotoWithComment[];
  };
  vans: VanStatus[];
  generalObservations: string;
}

const defaultEPIs: EPIItem[] = [
  { id: '1', name: 'Casco de seguridad', checked: false },
  { id: '2', name: 'Botas de seguridad', checked: false },
  { id: '3', name: 'Guantes de protección', checked: false },
  { id: '4', name: 'Gafas de protección', checked: false },
];

const defaultSafetyMeasures: SafetyMeasureItem[] = [
  // 1. Medidas de protección colectiva
  { id: 'pc1', name: 'Barandillas perimetrales en zonas elevadas', checked: false },
  { id: 'pc2', name: 'Redes de seguridad para evitar caídas en altura', checked: false },
  { id: 'pc3', name: 'Cubiertas provisionales de huecos (escaleras, ascensores, etc.)', checked: false },
  { id: 'pc4', name: 'Protecciones en bordes de forjados', checked: false },
  { id: 'pc5', name: 'Señalización de seguridad y balizamiento de zonas peligrosas', checked: false },
  { id: 'pc6', name: 'Andamios con sistemas de seguridad (rodapiés, barandillas, plataformas completas)', checked: false },
  { id: 'pc7', name: 'Sistemas anticaídas horizontales (líneas de vida)', checked: false },
  { id: 'pc8', name: 'Pasarelas y plataformas de trabajo seguras', checked: false },
  { id: 'pc9', name: 'Aislamiento de zonas de trabajo eléctrico o maquinaria', checked: false },
  { id: 'pc10', name: 'Control de acceso (vallas perimetrales, caseta de vigilancia)', checked: false },
  
  // 2. Equipos de Protección Individual (EPI)
  { id: 'epi1', name: 'Casco de seguridad', checked: false },
  { id: 'epi2', name: 'Chaleco reflectante', checked: false },
  { id: 'epi3', name: 'Guantes de protección (corte, químicos, etc.)', checked: false },
  { id: 'epi4', name: 'Botas con puntera reforzada y suela antideslizante', checked: false },
  { id: 'epi5', name: 'Protección auditiva (tapones o auriculares)', checked: false },
  { id: 'epi6', name: 'Gafas o pantallas faciales', checked: false },
  { id: 'epi7', name: 'Arnés de seguridad (para trabajos en altura)', checked: false },
  { id: 'epi8', name: 'Mascarillas o respiradores (polvo, químicos, etc.)', checked: false },
  { id: 'epi9', name: 'Ropa de protección (contra fuego, productos químicos, etc.)', checked: false },
  
  // 3. Medidas de protección eléctrica
  { id: 'pe1', name: 'Etiquetado y señalización de cuadros eléctricos', checked: false },
  { id: 'pe2', name: 'Uso de herramientas aisladas', checked: false },
  { id: 'pe3', name: 'Bloqueo y etiquetado de equipos en mantenimiento', checked: false },
  { id: 'pe4', name: 'Tomas de corriente protegidas', checked: false },
  { id: 'pe5', name: 'Instalaciones revisadas y certificadas', checked: false },
  
  // 4. Prevención de riesgos por maquinaria y herramientas
  { id: 'pm1', name: 'Mantenimiento preventivo de maquinaria', checked: false },
  { id: 'pm2', name: 'Uso adecuado de protecciones en herramientas (guardas, protectores)', checked: false },
  { id: 'pm3', name: 'Capacitación del personal que maneja equipos', checked: false },
  { id: 'pm4', name: 'Inspección diaria de herramientas portátiles', checked: false },
  
  // 5. Medidas durante trabajos en altura
  { id: 'ta1', name: 'Sistemas de anclaje certificados', checked: false },
  { id: 'ta2', name: 'Líneas de vida horizontales o verticales', checked: false },
  { id: 'ta3', name: 'Plataformas elevadoras seguras', checked: false },
  { id: 'ta4', name: 'Revisión diaria de arneses y eslingas', checked: false },
  { id: 'ta5', name: 'Supervisión continua', checked: false },
];


export const SafetyInspectionForm = () => {
  const location = useLocation();
  const [showPDFPreview, setShowPDFPreview] = useState(false);
  const [selectedLogo, setSelectedLogo] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [selectedFolder, setSelectedFolder] = useState('');
  const [isNewWork, setIsNewWork] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // ✅ Hook Offline-First
  const { isOnline, pendingCount, submitForm, retrySync } = useOfflineForm();
  
  const [inspectionData, setInspectionData] = useState<InspectionData>({
    expedientNumber: '',
    inspector: { name: '', email: '' },
    work: { name: '', location: '', promotingCompany: '' },
    workers: [{ id: '1', name: '', dni: '', category: '', company: '' }],
    episReviewed: defaultEPIs,
    safetyMeasures: defaultSafetyMeasures,
    workEnvironment: { photos: [] },
    toolsStatus: { photos: [] },
    vans: [{ id: '1', licensePlate: '', photos: [] }],
    generalObservations: ''
  });

  // =====================================================
  // CARGAR DATOS AUTOMÁTICAMENTE DESDE NAVEGACIÓN
  // =====================================================
  useEffect(() => {
    const state = location.state as any;
    
    if (state?.isNewWork !== undefined) {
      setIsNewWork(state.isNewWork);
    }

    if (state?.expedientNumber) {
      // Nueva obra: precargar solo el número de expediente
      setInspectionData(prev => ({
        ...prev,
        expedientNumber: state.expedientNumber
      }));
    }

    if (state?.folderName) {
      // Obra existente: establecer la carpeta
      setSelectedFolder(state.folderName);
    }

    if (state?.textData) {
      // Obra existente con datos: parsear y cargar automáticamente
      loadDataFromText(state.textData);
    }

    if (state?.loadFailed) {
      toast({
        title: 'Información',
        description: 'No se pudieron cargar los datos automáticamente. Usa "Cargar Acta Anterior Manualmente" para cargar el archivo manualmente.',
        variant: 'default'
      });
    }
  }, [location.state]);

  const loadDataFromText = (text: string) => {
    try {
      // Parsear los datos del archivo
      const expedientMatch = text.match(/N° de Expediente: (.+)/);
      const promoterMatch = text.match(/Promotor: (.+)/);
      const projectMatch = text.match(/Proyecto: (.+)/);
      const locationMatch = text.match(/Emplazamiento: (.+)/);
      const inspectorMatch = text.match(/Inspector: (.+)/);
      const emailMatch = text.match(/Email del Inspector: (.+)/);
      const folderMatch = text.match(/Carpeta de proyecto: (.+)/);
      const logoMatch = text.match(/Logo seleccionado: (.+)/);
      
      // Actualizar el estado con los datos recuperados
      setInspectionData(prev => ({
        ...prev,
        expedientNumber: expedientMatch?.[1] || '',
        work: {
          ...prev.work,
          promotingCompany: promoterMatch?.[1] || '',
          name: projectMatch?.[1] || '',
          location: locationMatch?.[1] || ''
        },
        inspector: {
          name: inspectorMatch?.[1] || '',
          email: emailMatch?.[1] || ''
        }
      }));
      
      // Actualizar carpeta si existe
      const folderValue = folderMatch?.[1];
      if (folderValue && folderValue !== 'No especificada') {
        setSelectedFolder(folderValue);
      }
      
      // Actualizar logo si existe
      const logoValue = logoMatch?.[1];
      if (logoValue && logoValue !== 'No seleccionado') {
        setSelectedLogo(logoValue);
      }
      
      toast({
        title: '✅ Datos cargados automáticamente',
        description: 'Los datos del acta anterior se han cargado correctamente.',
      });
    } catch (error) {
      console.error('Error al cargar datos:', error);
      toast({
        title: '❌ Error',
        description: 'No se pudieron cargar los datos automáticamente.',
        variant: 'destructive',
      });
    }
  };

  const addWorker = () => {
    const newWorker: Worker = {
      id: Date.now().toString(),
      name: '',
      dni: '',
      category: '',
      company: ''
    };
    setInspectionData(prev => ({
      ...prev,
      workers: [...prev.workers, newWorker]
    }));
  };

  const removeWorker = (id: string) => {
    setInspectionData(prev => ({
      ...prev,
      workers: prev.workers.filter(worker => worker.id !== id)
    }));
  };

  const updateWorker = (id: string, field: keyof Worker, value: string) => {
    setInspectionData(prev => ({
      ...prev,
      workers: prev.workers.map(worker => 
        worker.id === id ? { ...worker, [field]: value } : worker
      )
    }));
  };

  const handleFileUpload = (files: FileList | null, section: 'workEnvironment' | 'toolsStatus', vanId?: string) => {
    if (!files) return;

    Array.from(files).forEach(file => {
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        const newPhoto: PhotoWithComment = {
          id: Date.now().toString() + Math.random(),
          file,
          comment: '',
          url
        };

        if (vanId) {
          setInspectionData(prev => ({
            ...prev,
            vans: prev.vans.map(van =>
              van.id === vanId
                ? { ...van, photos: [...van.photos, newPhoto] }
                : van
            )
          }));
        } else {
          setInspectionData(prev => ({
            ...prev,
            [section]: {
              ...prev[section],
              photos: [...prev[section].photos, newPhoto]
            }
          }));
        }
      }
    });
    toast({ title: 'Fotos añadidas correctamente' });
  };

  const updatePhotoComment = (photoId: string, comment: string, section: 'workEnvironment' | 'toolsStatus', vanId?: string) => {
    if (vanId) {
      setInspectionData(prev => ({
        ...prev,
        vans: prev.vans.map(van =>
          van.id === vanId
            ? {
                ...van,
                photos: van.photos.map(photo =>
                  photo.id === photoId ? { ...photo, comment } : photo
                )
              }
            : van
        )
      }));
    } else {
      setInspectionData(prev => ({
        ...prev,
        [section]: {
          ...prev[section],
          photos: prev[section].photos.map(photo =>
            photo.id === photoId ? { ...photo, comment } : photo
          )
        }
      }));
    }
  };

  const removePhoto = (photoId: string, section: 'workEnvironment' | 'toolsStatus', vanId?: string) => {
    setInspectionData(prev => {
      if (vanId) {
        const van = prev.vans.find(v => v.id === vanId);
        const photoToRemove = van?.photos.find(photo => photo.id === photoId);
        if (photoToRemove && photoToRemove.url.startsWith('blob:')) {
          URL.revokeObjectURL(photoToRemove.url);
        }
        
        return {
          ...prev,
          vans: prev.vans.map(v =>
            v.id === vanId
              ? { ...v, photos: v.photos.filter(photo => photo.id !== photoId) }
              : v
          )
        };
      } else {
        const photoToRemove = prev[section].photos.find(photo => photo.id === photoId);
        if (photoToRemove && photoToRemove.url.startsWith('blob:')) {
          URL.revokeObjectURL(photoToRemove.url);
        }
        
        return {
          ...prev,
          [section]: {
            ...prev[section],
            photos: prev[section].photos.filter(photo => photo.id !== photoId)
          }
        };
      }
    });
  };

  const toggleEPI = (epiId: string) => {
    setInspectionData(prev => ({
      ...prev,
      episReviewed: prev.episReviewed.map(epi =>
        epi.id === epiId ? { ...epi, checked: !epi.checked } : epi
      )
    }));
  };

  const toggleSafetyMeasure = (measureId: string) => {
    setInspectionData(prev => ({
      ...prev,
      safetyMeasures: prev.safetyMeasures.map(measure =>
        measure.id === measureId ? { ...measure, checked: !measure.checked } : measure
      )
    }));
  };

  const addVan = () => {
    const newVan: VanStatus = {
      id: Date.now().toString(),
      licensePlate: '',
      photos: []
    };
    setInspectionData(prev => ({
      ...prev,
      vans: [...prev.vans, newVan]
    }));
  };

  const removeVan = (id: string) => {
    setInspectionData(prev => {
      const van = prev.vans.find(v => v.id === id);
      if (van) {
        van.photos.forEach(photo => {
          if (photo.url.startsWith('blob:')) {
            URL.revokeObjectURL(photo.url);
          }
        });
      }
      return {
        ...prev,
        vans: prev.vans.filter(v => v.id !== id)
      };
    });
  };

  const updateVanLicensePlate = (id: string, licensePlate: string) => {
    setInspectionData(prev => ({
      ...prev,
      vans: prev.vans.map(van =>
        van.id === id ? { ...van, licensePlate } : van
      )
    }));
  };

  // =====================================================
  // GENERAR NOMBRE DE ARCHIVO CON FORMATO
  // =====================================================
  
  const generateFilename = (extension?: string): string => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    const expedient = inspectionData.expedientNumber || 'SinExpediente';
    const workName = inspectionData.work.name || 'SinObra';
    
    // Formato: YYMMDD_Expediente. Nombre.Acta.extension
    const base = `${year}${month}${day}_${expedient}. ${workName}.Acta`;
    return extension ? `${base}.${extension}` : base;
  };

  // =====================================================
  // GENERAR ARCHIVO TXT CON INFORMACIÓN DEL PRIMER APARTADO
  // =====================================================
  
  const generateInspectionMetadata = (): string => {
    const date = new Date().toLocaleString('es-ES');
    return `DATOS DE LA INSPECCIÓN
=========================
Fecha de registro: ${date}

N° de Expediente: ${inspectionData.expedientNumber}
Promotor: ${inspectionData.work.promotingCompany}
Proyecto: ${inspectionData.work.name}
Emplazamiento: ${inspectionData.work.location}
Inspector: ${inspectionData.inspector.name}
Email del Inspector: ${inspectionData.inspector.email}

Carpeta de proyecto: ${selectedFolder || 'No especificada'}
Logo seleccionado: ${selectedLogo || 'No seleccionado'}
`;
  };

  // =====================================================
  // CARGAR DATOS DESDE ARCHIVO TXT
  // =====================================================
  
  const handleLoadMetadata = async (file: File) => {
    try {
      const text = await file.text();
      
      // Parsear los datos del archivo
      const expedientMatch = text.match(/N° de Expediente: (.+)/);
      const promoterMatch = text.match(/Promotor: (.+)/);
      const projectMatch = text.match(/Proyecto: (.+)/);
      const locationMatch = text.match(/Emplazamiento: (.+)/);
      const inspectorMatch = text.match(/Inspector: (.+)/);
      const emailMatch = text.match(/Email del Inspector: (.+)/);
      const folderMatch = text.match(/Carpeta de proyecto: (.+)/);
      const logoMatch = text.match(/Logo seleccionado: (.+)/);
      
      // Actualizar el estado con los datos recuperados
      setInspectionData(prev => ({
        ...prev,
        expedientNumber: expedientMatch?.[1] || '',
        work: {
          ...prev.work,
          promotingCompany: promoterMatch?.[1] || '',
          name: projectMatch?.[1] || '',
          location: locationMatch?.[1] || '',
        },
        inspector: {
          name: inspectorMatch?.[1] || '',
          email: emailMatch?.[1] || '',
        },
      }));
      
      const folderValue = folderMatch?.[1];
      if (folderValue && folderValue !== 'No especificada') {
        setSelectedFolder(folderValue);
      }
      
      const logoValue = logoMatch?.[1];
      if (logoValue && logoValue !== 'No seleccionado') {
        setSelectedLogo(logoValue);
      }
      
      toast({
        title: '✅ Datos cargados',
        description: 'Los datos de la inspección se han recuperado correctamente.',
      });
    } catch (error) {
      console.error('Error al cargar datos:', error);
      toast({
        title: '❌ Error',
        description: 'No se pudo leer el archivo.',
        variant: 'destructive',
      });
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleLoadMetadata(file);
    }
  };

  // =====================================================
  // GUARDAR FORMULARIO CON SOPORTE OFFLINE
  // =====================================================
  
  const handleSaveForm = async () => {
    try {
      const { WebhookApi } = await import('@/services/webhookApi');
      
      // Generar archivo txt con metadatos
      const metadataContent = generateInspectionMetadata();
      const metadataBlob = new Blob([metadataContent], { type: 'text/plain' });
      const metadataFilename = generateFilename('txt');
      
      // Enviar archivo de metadatos al endpoint
      const projectName = inspectionData.work.name || 'Sin_Proyecto';
      await WebhookApi.uploadDocument({
        file: metadataBlob,
        filename: metadataFilename,
        projectName,
        type: 'pdf',
        metadata: {
          expedientNumber: inspectionData.expedientNumber,
          folder: selectedFolder,
          timestamp: new Date().toISOString()
        }
      });

      // Enviar todas las fotos al endpoint con numeración por sección
      const baseFilename = generateFilename();
      
      // Agrupar fotos por sección y numerarlas
      const photosBySection = {
        'Entorno_Trabajo': inspectionData.workEnvironment.photos,
        'Estado_Herramientas': inspectionData.toolsStatus.photos,
        ...inspectionData.vans.reduce((acc, van) => {
          acc[`Furgoneta_${van.licensePlate}`] = van.photos;
          return acc;
        }, {} as Record<string, typeof inspectionData.workEnvironment.photos>)
      };

      // Enviar fotos con manejo de errores individual
      let successCount = 0;
      let failCount = 0;

      for (const [section, photos] of Object.entries(photosBySection)) {
        let photoNum = 1;
        for (const photo of photos) {
          try {
            const identifier = photo.comment || photoNum.toString();
            await WebhookApi.uploadDocument({
              file: photo.file,
              filename: `${baseFilename}.${section}.${identifier}.jpg`,
              projectName,
              type: 'pdf',
              metadata: {
                expedientNumber: inspectionData.expedientNumber,
                comment: photo.comment,
                section: section,
                photoNumber: photoNum
              }
            });
            successCount++;
          } catch (error) {
            console.error(`Error subiendo foto ${section} #${photoNum}:`, error);
            failCount++;
          }
          photoNum++;
        }
      }

      if (failCount > 0) {
        console.warn(`${failCount} foto(s) no se pudieron enviar al webhook`);
      }
      
      toast({
        title: '✅ Inspección completada',
        description: 'El reporte y las imágenes se han enviado al endpoint.',
      });
    } catch (error) {
      console.error('Error al guardar formulario:', error);
      toast({
        title: '❌ Error',
        description: 'No se pudo enviar el reporte.',
        variant: 'destructive'
      });
    }
  };


  if (showPDFPreview) {
    return (
      <InspectionPDFPreview
        data={inspectionData}
        logoUrl={logoUrl}
        selectedFolder={selectedFolder}
        onClose={() => setShowPDFPreview(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-safety-green-light to-background p-4 pb-48">
      <div className="max-w-4xl mx-auto space-y-8">
        <Button
          variant="ghost"
          onClick={() => window.location.href = '/'}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver al menú
        </Button>

        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary mb-2">
            Acta de Inspección de Seguridad
          </h1>
          <p className="text-muted-foreground">
            Sistema de inspección de elementos de seguridad personal
          </p>
          
          {/* Indicador de Estado de Conexión y Cola */}
          <div className="flex items-center justify-center gap-4 mt-4">
            <Badge 
              variant={isOnline ? "default" : "destructive"}
              className="flex items-center gap-2 px-4 py-2"
            >
              {isOnline ? (
                <>
                  <Wifi className="h-4 w-4" />
                  Conectado
                </>
              ) : (
                <>
                  <WifiOff className="h-4 w-4" />
                  Sin conexión
                </>
              )}
            </Badge>
            
            {pendingCount > 0 && (
              <Badge variant="secondary" className="flex items-center gap-2 px-4 py-2">
                <RefreshCw className="h-4 w-4" />
                {pendingCount} pendiente{pendingCount > 1 ? 's' : ''}
              </Badge>
            )}
            
            {pendingCount > 0 && isOnline && (
              <Button
                onClick={retrySync}
                size="sm"
                variant="outline"
                className="text-xs"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Sincronizar
              </Button>
            )}
          </div>
        </div>

        {/* Estado de la Cola Offline */}
        <OfflineQueueStatus />

        {/* Logo Selection */}
        <Card className="shadow-safety">
          <CardHeader>
            <CardTitle className="text-primary">Selección de Logo y Carpeta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {!isNewWork && (
              <div>
                <Label>Cargar Acta Anterior Manualmente</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  className="w-full"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Cargar Acta Anterior Manualmente
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  Método alternativo: carga manualmente un archivo .txt de una inspección previa
                </p>
              </div>
            )}
            <LogoSelector
              selectedLogo={selectedLogo}
              onLogoChange={(name, url) => {
                setSelectedLogo(name);
                setLogoUrl(url);
              }}
            />
            <FolderManager
              selectedFolder={selectedFolder}
              onFolderChange={setSelectedFolder}
              expedientNumber={inspectionData.expedientNumber}
              workName={inspectionData.work.name}
            />
          </CardContent>
        </Card>

        {/* Inspector Info */}
        <Card className="shadow-safety">
          <CardHeader>
            <CardTitle className="text-primary">1. Datos de la Inspección</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="expedient-number">N° de Expediente</Label>
              <Input
                id="expedient-number"
                value={inspectionData.expedientNumber}
                onChange={(e) => setInspectionData(prev => ({
                  ...prev,
                  expedientNumber: e.target.value
                }))}
                placeholder="Ej: EXP-2025-001"
              />
            </div>
            <div>
              <Label htmlFor="promoting-company">Promotor</Label>
              <Input
                id="promoting-company"
                value={inspectionData.work.promotingCompany}
                onChange={(e) => setInspectionData(prev => ({
                  ...prev,
                  work: { ...prev.work, promotingCompany: e.target.value }
                }))}
              />
            </div>
            <div>
              <Label htmlFor="work-name">Proyecto</Label>
              <Input
                id="work-name"
                value={inspectionData.work.name}
                onChange={(e) => setInspectionData(prev => ({
                  ...prev,
                  work: { ...prev.work, name: e.target.value }
                }))}
              />
            </div>
            <div>
              <Label htmlFor="work-location">Emplazamiento</Label>
              <Input
                id="work-location"
                value={inspectionData.work.location}
                onChange={(e) => setInspectionData(prev => ({
                  ...prev,
                  work: { ...prev.work, location: e.target.value }
                }))}
              />
            </div>
            <div>
              <Label htmlFor="inspector-name">Inspector</Label>
              <Input
                id="inspector-name"
                value={inspectionData.inspector.name}
                onChange={(e) => setInspectionData(prev => ({
                  ...prev,
                  inspector: { ...prev.inspector, name: e.target.value }
                }))}
              />
            </div>
            <div>
              <Label htmlFor="inspector-email">Email del Inspector</Label>
              <Input
                id="inspector-email"
                type="email"
                value={inspectionData.inspector.email}
                onChange={(e) => setInspectionData(prev => ({
                  ...prev,
                  inspector: { ...prev.inspector, email: e.target.value }
                }))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Workers */}
        <Card className="shadow-safety">
          <CardHeader>
            <CardTitle className="text-primary flex items-center justify-between">
              2. Participantes
              <Button onClick={addWorker} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Añadir Operario
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {inspectionData.workers.map((worker, index) => (
              <div key={worker.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold">Operario #{index + 1}</h4>
                  {inspectionData.workers.length > 1 && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => removeWorker(worker.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Nombre completo</Label>
                    <Input
                      value={worker.name}
                      onChange={(e) => updateWorker(worker.id, 'name', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>DNI</Label>
                    <Input
                      value={worker.dni}
                      onChange={(e) => updateWorker(worker.id, 'dni', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Categoría</Label>
                    <Input
                      value={worker.category}
                      onChange={(e) => updateWorker(worker.id, 'category', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Empresa</Label>
                    <Input
                      value={worker.company}
                      onChange={(e) => updateWorker(worker.id, 'company', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Safety Measures Checklist */}
        <Card className="shadow-safety">
          <CardHeader>
            <CardTitle className="text-primary">3. Medidas de Seguridad y Prevención</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Medidas de protección colectiva */}
            <div>
              <h3 className="font-semibold text-lg mb-3">1. Medidas de protección colectiva</h3>
              <div className="grid grid-cols-1 gap-3">
                {inspectionData.safetyMeasures
                  .filter(m => m.id.startsWith('pc'))
                  .map((measure) => (
                    <div key={measure.id} className="flex items-center space-x-3">
                      <Checkbox
                        id={measure.id}
                        checked={measure.checked}
                        onCheckedChange={() => toggleSafetyMeasure(measure.id)}
                      />
                      <Label htmlFor={measure.id} className="cursor-pointer text-sm">
                        {measure.name}
                      </Label>
                    </div>
                  ))}
              </div>
            </div>

            {/* Equipos de Protección Individual */}
            <div>
              <h3 className="font-semibold text-lg mb-3">2. Equipos de Protección Individual (EPI)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {inspectionData.safetyMeasures
                  .filter(m => m.id.startsWith('epi'))
                  .map((measure) => (
                    <div key={measure.id} className="flex items-center space-x-3">
                      <Checkbox
                        id={measure.id}
                        checked={measure.checked}
                        onCheckedChange={() => toggleSafetyMeasure(measure.id)}
                      />
                      <Label htmlFor={measure.id} className="cursor-pointer text-sm">
                        {measure.name}
                      </Label>
                    </div>
                  ))}
              </div>
            </div>

            {/* Medidas de protección eléctrica */}
            <div>
              <h3 className="font-semibold text-lg mb-3">3. Medidas de protección eléctrica</h3>
              <div className="grid grid-cols-1 gap-3">
                {inspectionData.safetyMeasures
                  .filter(m => m.id.startsWith('pe'))
                  .map((measure) => (
                    <div key={measure.id} className="flex items-center space-x-3">
                      <Checkbox
                        id={measure.id}
                        checked={measure.checked}
                        onCheckedChange={() => toggleSafetyMeasure(measure.id)}
                      />
                      <Label htmlFor={measure.id} className="cursor-pointer text-sm">
                        {measure.name}
                      </Label>
                    </div>
                  ))}
              </div>
            </div>

            {/* Prevención de riesgos por maquinaria */}
            <div>
              <h3 className="font-semibold text-lg mb-3">4. Prevención de riesgos por maquinaria y herramientas</h3>
              <div className="grid grid-cols-1 gap-3">
                {inspectionData.safetyMeasures
                  .filter(m => m.id.startsWith('pm'))
                  .map((measure) => (
                    <div key={measure.id} className="flex items-center space-x-3">
                      <Checkbox
                        id={measure.id}
                        checked={measure.checked}
                        onCheckedChange={() => toggleSafetyMeasure(measure.id)}
                      />
                      <Label htmlFor={measure.id} className="cursor-pointer text-sm">
                        {measure.name}
                      </Label>
                    </div>
                  ))}
              </div>
            </div>

            {/* Medidas durante trabajos en altura */}
            <div>
              <h3 className="font-semibold text-lg mb-3">5. Medidas durante trabajos en altura</h3>
              <div className="grid grid-cols-1 gap-3">
                {inspectionData.safetyMeasures
                  .filter(m => m.id.startsWith('ta'))
                  .map((measure) => (
                    <div key={measure.id} className="flex items-center space-x-3">
                      <Checkbox
                        id={measure.id}
                        checked={measure.checked}
                        onCheckedChange={() => toggleSafetyMeasure(measure.id)}
                      />
                      <Label htmlFor={measure.id} className="cursor-pointer text-sm">
                        {measure.name}
                      </Label>
                    </div>
                  ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Work Environment Photos */}
        <PhotoUploadSection
          title="4. Entorno de la Obra"
          inputId="photos-workEnvironment"
          photos={inspectionData.workEnvironment.photos}
          onUpload={(files) => handleFileUpload(files, 'workEnvironment')}
          onRemove={(id) => removePhoto(id, 'workEnvironment')}
          onCommentChange={(id, comment) => updatePhotoComment(id, comment, 'workEnvironment')}
        />

        {/* Tools Status Photos */}
        <PhotoUploadSection
          title="5. Estado de las Herramientas"
          inputId="photos-toolsStatus"
          photos={inspectionData.toolsStatus.photos}
          onUpload={(files) => handleFileUpload(files, 'toolsStatus')}
          onRemove={(id) => removePhoto(id, 'toolsStatus')}
          onCommentChange={(id, comment) => updatePhotoComment(id, comment, 'toolsStatus')}
        />

        {/* Vans Status - Multiple */}
        <Card className="shadow-safety">
          <CardHeader>
            <CardTitle className="text-primary flex items-center justify-between">
              6. Estado de las Furgonetas
              <Button onClick={addVan} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Añadir Furgoneta
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {inspectionData.vans.map((van, index) => (
              <div key={van.id} className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">Furgoneta #{index + 1}</h4>
                  {inspectionData.vans.length > 1 && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => removeVan(van.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <div>
                  <Label htmlFor={`license-plate-${van.id}`}>Matrícula</Label>
                  <Input
                    id={`license-plate-${van.id}`}
                    value={van.licensePlate}
                    onChange={(e) => updateVanLicensePlate(van.id, e.target.value)}
                  />
                </div>
                
                <PhotoUploadSection
                  title="Fotos de la Furgoneta"
                  inputId={`photos-van-${van.id}`}
                  photos={van.photos}
                  onUpload={(files) => handleFileUpload(files, 'workEnvironment', van.id)}
                  onRemove={(id) => removePhoto(id, 'workEnvironment', van.id)}
                  onCommentChange={(id, comment) => updatePhotoComment(id, comment, 'workEnvironment', van.id)}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* General Observations */}
        <Card className="shadow-safety">
          <CardHeader>
            <CardTitle className="text-primary">7. Observaciones Generales</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={inspectionData.generalObservations}
              onChange={(e) => setInspectionData(prev => ({
                ...prev,
                generalObservations: e.target.value
              }))}
              placeholder="Conclusiones generales de la inspección..."
              rows={5}
            />
          </CardContent>
        </Card>

      </div>

      {/* Fixed Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border shadow-lg z-50">
        <div className="max-w-4xl mx-auto p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row justify-center gap-2 sm:gap-3">
            <Button
              onClick={handleSaveForm}
              size="lg"
              variant="outline"
              className="shadow-safety w-full sm:w-auto"
            >
              <Save className="h-5 w-5 mr-2" />
              <span className="hidden sm:inline">Guardar Formulario</span>
              <span className="sm:hidden">Guardar</span>
            </Button>
            <Button
              onClick={() => setShowPDFPreview(true)}
              size="lg"
              variant="default"
              className="shadow-safety w-full sm:w-auto"
            >
              <Eye className="h-5 w-5 mr-2" />
              <span className="hidden sm:inline">Generar Informe PDF</span>
              <span className="sm:hidden">Generar PDF</span>
            </Button>
            <Button
              onClick={() => window.location.href = '/'}
              size="lg"
              variant="secondary"
              className="shadow-safety w-full sm:w-auto"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              <span className="hidden sm:inline">Volver al Inicio</span>
              <span className="sm:hidden">Inicio</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};