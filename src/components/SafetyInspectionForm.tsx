import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, Eye, Wifi, WifiOff, RefreshCw, Save, Upload } from 'lucide-react';
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


export const SafetyInspectionForm = () => {
  const [showPDFPreview, setShowPDFPreview] = useState(false);
  const [selectedLogo, setSelectedLogo] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [selectedFolder, setSelectedFolder] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // ✅ Hook Offline-First
  const { isOnline, pendingCount, submitForm, retrySync } = useOfflineForm();
  
  const [inspectionData, setInspectionData] = useState<InspectionData>({
    expedientNumber: '',
    inspector: { name: '', email: '' },
    work: { name: '', location: '', promotingCompany: '' },
    workers: [{ id: '1', name: '', dni: '', category: '', company: '' }],
    episReviewed: defaultEPIs,
    workEnvironment: { photos: [] },
    toolsStatus: { photos: [] },
    vans: [{ id: '1', licensePlate: '', photos: [] }],
    generalObservations: ''
  });

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
  
  const generateFilename = (extension: string = 'txt'): string => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    const expedient = inspectionData.expedientNumber || 'SinExpediente';
    const workName = inspectionData.work.name || 'SinObra';
    
    return `${expedient}.${workName}_${year}_${day}_${month}.${extension}`;
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

      // Enviar todas las fotos al endpoint en una carpeta
      const baseFilename = generateFilename('').replace(/\.\w+$/, '');
      const photoFolder = `${baseFilename}/Fotos`;
      const allPhotos = [
        ...inspectionData.workEnvironment.photos.map(p => ({ ...p, section: 'Entorno_Trabajo' })),
        ...inspectionData.toolsStatus.photos.map(p => ({ ...p, section: 'Estado_Herramientas' })),
        ...inspectionData.vans.flatMap(van => 
          van.photos.map(p => ({ ...p, section: `Furgoneta_${van.licensePlate}` }))
        )
      ];

      for (const photo of allPhotos) {
        await WebhookApi.uploadDocument({
          file: photo.file,
          filename: `${photoFolder}/${photo.section}_${photo.id}.jpg`,
          projectName,
          type: 'pdf',
          metadata: {
            expedientNumber: inspectionData.expedientNumber,
            comment: photo.comment,
            section: photo.section,
            folder: photoFolder
          }
        });
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
            <div>
              <Label>Cargar Datos de Inspección</Label>
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
                Cargar archivo .txt
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Selecciona un archivo .txt previamente generado para recuperar los datos
              </p>
            </div>
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

        {/* EPIs */}
        <Card className="shadow-safety">
          <CardHeader>
            <CardTitle className="text-primary">3. Resumen de las EPIS inspeccionadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {inspectionData.episReviewed.map((epi) => (
                <div key={epi.id} className="flex items-center space-x-3">
                  <Checkbox
                    id={epi.id}
                    checked={epi.checked}
                    onCheckedChange={() => toggleEPI(epi.id)}
                  />
                  <Label htmlFor={epi.id} className="cursor-pointer">
                    {epi.name}
                  </Label>
                  {epi.checked && (
                    <Badge variant="secondary" className="bg-safety-green-light text-safety-green">
                      Revisado
                    </Badge>
                  )}
                </div>
              ))}
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
            <CardTitle className="text-primary">9. Observaciones Generales</CardTitle>
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
          </div>
        </div>
      </div>
    </div>
  );
};