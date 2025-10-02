import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, Eye, FileText, Wifi, WifiOff, RefreshCw, Save } from 'lucide-react';
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
  
  // ✅ Hook Offline-First
  const { isOnline, pendingCount, submitForm, retrySync } = useOfflineForm();
  
  const [inspectionData, setInspectionData] = useState<InspectionData>({
    inspector: { name: '', email: '' },
    work: { name: '', location: '', promotingCompany: '' },
    workers: [{ id: '1', name: '', dni: '', category: '', company: '' }],
    episReviewed: defaultEPIs,
    workEnvironment: { photos: [] },
    toolsStatus: { photos: [] },
    vanStatus: {
      licensePlate: '',
      photos: []
    },
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

  const handleFileUpload = (files: FileList | null, section: 'workEnvironment' | 'toolsStatus' | 'vanStatus') => {
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

        setInspectionData(prev => ({
          ...prev,
          [section]: {
            ...prev[section],
            photos: [...prev[section].photos, newPhoto]
          }
        }));
      }
    });
    toast({ title: 'Fotos añadidas correctamente' });
  };

  const updatePhotoComment = (photoId: string, comment: string, section: 'workEnvironment' | 'toolsStatus' | 'vanStatus') => {
    setInspectionData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        photos: prev[section].photos.map(photo =>
          photo.id === photoId ? { ...photo, comment } : photo
        )
      }
    }));
  };

  const removePhoto = (photoId: string, section: 'workEnvironment' | 'toolsStatus' | 'vanStatus') => {
    setInspectionData(prev => {
      // Find the photo to revoke its blob URL
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
    });
  };

  const clearImagesCache = () => {
    // Revoke all existing blob URLs for photos
    const allPhotos = [
      ...inspectionData.workEnvironment.photos,
      ...inspectionData.toolsStatus.photos,
      ...inspectionData.vanStatus.photos
    ];
    
    allPhotos.forEach(photo => {
      if (photo.url.startsWith('blob:')) {
        URL.revokeObjectURL(photo.url);
      }
    });

    // Clear all photos from state
    setInspectionData(prev => ({
      ...prev,
      workEnvironment: { photos: [] },
      toolsStatus: { photos: [] },
      vanStatus: { ...prev.vanStatus, photos: [] }
    }));

    toast({
      title: "Imágenes eliminadas",
      description: "Todas las imágenes han sido eliminadas de la caché correctamente.",
    });
  };

  const clearAllCache = () => {
    // Clear all form data
    setInspectionData({
      inspector: { name: '', email: '' },
      work: { name: '', location: '', promotingCompany: '' },
      workers: [{ id: '1', name: '', dni: '', category: '', company: '' }],
      episReviewed: defaultEPIs,
      workEnvironment: { photos: [] },
      toolsStatus: { photos: [] },
      vanStatus: { licensePlate: '', photos: [] },
      generalObservations: ''
    });

    // Clear logo and folder selection
    setSelectedLogo('');
    setLogoUrl('');
    setSelectedFolder('');

    // Clear localStorage
    localStorage.removeItem('uploadedLogos');
    localStorage.removeItem('selectedLogo');
    localStorage.removeItem('availableFolders');
    localStorage.removeItem('selectedFolder');

    // Revoke all existing blob URLs
    const allPhotos = [
      ...inspectionData.workEnvironment.photos,
      ...inspectionData.toolsStatus.photos,
      ...inspectionData.vanStatus.photos
    ];
    
    allPhotos.forEach(photo => {
      if (photo.url.startsWith('blob:')) {
        URL.revokeObjectURL(photo.url);
      }
    });

    toast({
      title: "Caché limpiado",
      description: "Todos los datos del formulario y caché han sido eliminados correctamente.",
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

  // =====================================================
  // GUARDAR FORMULARIO CON SOPORTE OFFLINE
  // =====================================================
  
  const handleSaveForm = async () => {
    try {
      const result = await submitForm(
        '/api/inspections',
        {
          ...inspectionData,
          logo: logoUrl,
          folder: selectedFolder,
          submittedAt: new Date().toISOString()
        },
        'POST'
      );

      if (result.queued) {
        toast({
          title: '💾 Formulario guardado localmente',
          description: `Se sincronizará automáticamente cuando haya conexión. (${pendingCount + 1} pendientes)`,
        });
      } else {
        toast({
          title: '✅ Formulario guardado',
          description: 'Los datos se han enviado correctamente al servidor.',
        });
      }
    } catch (error) {
      console.error('Error al guardar formulario:', error);
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
    <div className="min-h-screen bg-gradient-to-br from-safety-green-light to-background p-4">
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
            <CardTitle className="text-primary">1. Selección de Logo y Carpeta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
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
            />
          </CardContent>
        </Card>

        {/* Inspector Info */}
        <Card className="shadow-safety">
          <CardHeader>
            <CardTitle className="text-primary">2. Datos del Inspector</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="inspector-name">Nombre completo</Label>
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
              <Label htmlFor="inspector-email">Email</Label>
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

        {/* Work Info */}
        <Card className="shadow-safety">
          <CardHeader>
            <CardTitle className="text-primary">3. Datos de la Obra</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="work-name">Nombre de la obra</Label>
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
              <Label htmlFor="work-location">Ubicación</Label>
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
              <Label htmlFor="promoting-company">Empresa Promotora</Label>
              <Input
                id="promoting-company"
                value={inspectionData.work.promotingCompany}
                onChange={(e) => setInspectionData(prev => ({
                  ...prev,
                  work: { ...prev.work, promotingCompany: e.target.value }
                }))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Workers */}
        <Card className="shadow-safety">
          <CardHeader>
            <CardTitle className="text-primary flex items-center justify-between">
              3. Operarios en la Obra
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
            <CardTitle className="text-primary">5. Equipos de Protección Individual</CardTitle>
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
          title="6. Entorno de la Obra"
          inputId="photos-workEnvironment"
          photos={inspectionData.workEnvironment.photos}
          onUpload={(files) => handleFileUpload(files, 'workEnvironment')}
          onRemove={(id) => removePhoto(id, 'workEnvironment')}
          onCommentChange={(id, comment) => updatePhotoComment(id, comment, 'workEnvironment')}
        />

        {/* Tools Status Photos */}
        <PhotoUploadSection
          title="7. Estado de las Herramientas"
          inputId="photos-toolsStatus"
          photos={inspectionData.toolsStatus.photos}
          onUpload={(files) => handleFileUpload(files, 'toolsStatus')}
          onRemove={(id) => removePhoto(id, 'toolsStatus')}
          onCommentChange={(id, comment) => updatePhotoComment(id, comment, 'toolsStatus')}
        />

        {/* Van Status */}
        <Card className="shadow-safety">
          <CardHeader>
            <CardTitle className="text-primary">8. Estado de la Furgoneta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="license-plate">Matrícula</Label>
              <Input
                id="license-plate"
                value={inspectionData.vanStatus.licensePlate}
                onChange={(e) => setInspectionData(prev => ({
                  ...prev,
                  vanStatus: { ...prev.vanStatus, licensePlate: e.target.value }
                }))}
              />
            </div>
            
            <PhotoUploadSection
              title="Fotos de la Furgoneta (cada foto debe incluir un comentario que describa qué aspecto se está inspeccionando)"
              inputId="photos-vanStatus"
              photos={inspectionData.vanStatus.photos}
              onUpload={(files) => handleFileUpload(files, 'vanStatus')}
              onRemove={(id) => removePhoto(id, 'vanStatus')}
              onCommentChange={(id, comment) => updatePhotoComment(id, comment, 'vanStatus')}
            />
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

        {/* Submit and Generate PDF Buttons */}
        <div className="flex justify-center gap-4 pb-8">
          <Button
            onClick={handleSaveForm}
            size="lg"
            variant="outline"
            className="shadow-safety"
          >
            <Save className="h-5 w-5 mr-2" />
            Guardar Formulario
          </Button>
          <Button
            onClick={clearAllCache}
            size="lg"
            variant="outline"
            className="border-red-500 text-red-600 hover:bg-red-50 shadow-safety"
          >
            <Trash2 className="h-5 w-5 mr-2" />
            Limpiar Todo
          </Button>
          <Button
            onClick={clearImagesCache}
            size="lg"
            variant="outline"
            className="border-orange-500 text-orange-600 hover:bg-orange-50 shadow-safety"
          >
            <Trash2 className="h-5 w-5 mr-2" />
            Solo Imágenes
          </Button>
          <Button
            onClick={() => setShowPDFPreview(true)}
            size="lg"
            className="bg-gradient-safety text-primary-foreground shadow-safety"
          >
            <Eye className="h-5 w-5 mr-2" />
            Generar Informe PDF
          </Button>
        </div>
      </div>
    </div>
  );
};