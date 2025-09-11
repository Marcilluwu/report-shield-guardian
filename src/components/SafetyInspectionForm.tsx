import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Trash2, Upload, Plus, Eye } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { InspectionPDFPreview } from './InspectionPDFPreview';

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

interface VanInspectionItem {
  aspect: string;
  state: 'Bueno' | 'Regular' | 'Malo' | '';
  observations: string;
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
    inspectionItems: VanInspectionItem[];
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

const vanInspectionAspects = [
  'Estado exterior',
  'Estado interior',
  'Organización herramientas',
  'Limpieza general',
  'Documentación vehículo',
  'Kit emergencia',
];

export const SafetyInspectionForm = () => {
  const [showPDFPreview, setShowPDFPreview] = useState(false);
  const [inspectionData, setInspectionData] = useState<InspectionData>({
    inspector: { name: '', email: '' },
    work: { name: '', location: '', promotingCompany: '' },
    workers: [{ id: '1', name: '', dni: '', category: '', company: '' }],
    episReviewed: defaultEPIs,
    workEnvironment: { photos: [] },
    toolsStatus: { photos: [] },
    vanStatus: {
      licensePlate: '',
      inspectionItems: vanInspectionAspects.map(aspect => ({
        aspect,
        state: '' as const,
        observations: ''
      })),
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
    setInspectionData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        photos: prev[section].photos.filter(photo => photo.id !== photoId)
      }
    }));
  };

  const toggleEPI = (epiId: string) => {
    setInspectionData(prev => ({
      ...prev,
      episReviewed: prev.episReviewed.map(epi =>
        epi.id === epiId ? { ...epi, checked: !epi.checked } : epi
      )
    }));
  };

  const updateVanInspectionItem = (index: number, field: 'state' | 'observations', value: string) => {
    setInspectionData(prev => ({
      ...prev,
      vanStatus: {
        ...prev.vanStatus,
        inspectionItems: prev.vanStatus.inspectionItems.map((item, i) =>
          i === index ? { ...item, [field]: value } : item
        )
      }
    }));
  };

  const PhotoUploadSection = ({ 
    title, 
    photos, 
    section 
  }: { 
    title: string; 
    photos: PhotoWithComment[]; 
    section: 'workEnvironment' | 'toolsStatus' | 'vanStatus' 
  }) => (
    <Card className="shadow-safety">
      <CardHeader>
        <CardTitle className="text-primary">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor={`photos-${section}`} className="cursor-pointer">
            <div className="border-2 border-dashed border-primary/30 rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
              <Upload className="mx-auto h-8 w-8 text-primary mb-2" />
              <p className="text-sm text-muted-foreground">Subir fotos</p>
            </div>
          </Label>
          <Input
            id={`photos-${section}`}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleFileUpload(e.target.files, section)}
          />
        </div>
        
        {photos.map((photo) => (
          <div key={photo.id} className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <img
                src={photo.url}
                alt="Preview"
                className="w-20 h-20 object-cover rounded-md"
              />
              <Button
                variant="destructive"
                size="sm"
                onClick={() => removePhoto(photo.id, section)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div>
              <Label htmlFor={`comment-${photo.id}`}>Comentario</Label>
              <Textarea
                id={`comment-${photo.id}`}
                value={photo.comment}
                onChange={(e) => updatePhotoComment(photo.id, e.target.value, section)}
                placeholder="Añadir comentario sobre esta foto..."
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );

  if (showPDFPreview) {
    return (
      <InspectionPDFPreview
        inspectionData={inspectionData}
        onBack={() => setShowPDFPreview(false)}
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
        </div>

        {/* Inspector Info */}
        <Card className="shadow-safety">
          <CardHeader>
            <CardTitle className="text-primary">1. Datos del Inspector</CardTitle>
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
            <CardTitle className="text-primary">2. Datos de la Obra</CardTitle>
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
            <CardTitle className="text-primary">4. Equipos de Protección Individual</CardTitle>
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
          title="5. Entorno de la Obra"
          photos={inspectionData.workEnvironment.photos}
          section="workEnvironment"
        />

        {/* Tools Status Photos */}
        <PhotoUploadSection
          title="6. Estado de las Herramientas"
          photos={inspectionData.toolsStatus.photos}
          section="toolsStatus"
        />

        {/* Van Status */}
        <Card className="shadow-safety">
          <CardHeader>
            <CardTitle className="text-primary">7. Estado de la Furgoneta</CardTitle>
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
            
            <div className="space-y-4">
              <h4 className="font-semibold">Aspectos de Inspección</h4>
              {inspectionData.vanStatus.inspectionItems.map((item, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-3">
                  <h5 className="font-medium">{item.aspect}</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Estado</Label>
                      <select
                        className="w-full p-2 border rounded-md"
                        value={item.state}
                        onChange={(e) => updateVanInspectionItem(index, 'state', e.target.value)}
                      >
                        <option value="">Seleccionar...</option>
                        <option value="Bueno">Bueno</option>
                        <option value="Regular">Regular</option>
                        <option value="Malo">Malo</option>
                      </select>
                    </div>
                    <div>
                      <Label>Observaciones</Label>
                      <Input
                        value={item.observations}
                        onChange={(e) => updateVanInspectionItem(index, 'observations', e.target.value)}
                        placeholder="Observaciones..."
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <PhotoUploadSection
              title="Fotos de la Furgoneta"
              photos={inspectionData.vanStatus.photos}
              section="vanStatus"
            />
          </CardContent>
        </Card>

        {/* General Observations */}
        <Card className="shadow-safety">
          <CardHeader>
            <CardTitle className="text-primary">8. Observaciones Generales</CardTitle>
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

        {/* Generate PDF Button */}
        <div className="flex justify-center pb-8">
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