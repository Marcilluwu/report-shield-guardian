import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Upload, Image as ImageIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';

interface LogoSelectorProps {
  selectedLogo: string;
  onLogoChange: (logoName: string, logoUrl: string) => void;
}

export const LogoSelector: React.FC<LogoSelectorProps> = ({ selectedLogo, onLogoChange }) => {
  const [availableLogos, setAvailableLogos] = useState<{ name: string; url: string }[]>([]);

  // Función para cargar logos desde la carpeta Media/Icons
  const loadLogos = async () => {
    try {
      // En un entorno real, esto requeriría una API que liste los archivos
      // Por ahora, mantendremos una lista de logos cargados dinámicamente
      const logos = JSON.parse(localStorage.getItem('uploadedLogos') || '[]');
      setAvailableLogos(logos);
    } catch (error) {
      console.error('Error cargando logos:', error);
    }
  };

  useEffect(() => {
    loadLogos();
  }, []);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      if (file.type === 'image/png') {
        const reader = new FileReader();
        reader.onload = (e) => {
          const logoName = file.name.replace('.png', '');
          const logoUrl = e.target?.result as string;
          
          // Guardar en localStorage (en producción sería una API)
          const existingLogos = JSON.parse(localStorage.getItem('uploadedLogos') || '[]');
          const newLogo = { name: logoName, url: logoUrl };
          const updatedLogos = existingLogos.filter((logo: any) => logo.name !== logoName);
          updatedLogos.push(newLogo);
          
          localStorage.setItem('uploadedLogos', JSON.stringify(updatedLogos));
          setAvailableLogos(updatedLogos);
          
          toast({
            title: 'Logo subido correctamente',
            description: `${logoName} está disponible para usar`
          });
        };
        reader.readAsDataURL(file);
      } else {
        toast({
          title: 'Formato no válido',
          description: 'Solo se permiten archivos PNG',
          variant: 'destructive'
        });
      }
    });
    
    // Limpiar el input
    event.target.value = '';
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="logo-upload" className="cursor-pointer">
          <div className="border-2 border-dashed border-primary/30 rounded-lg p-4 text-center hover:border-primary/50 transition-colors">
            <Upload className="mx-auto h-6 w-6 text-primary mb-2" />
            <p className="text-sm text-muted-foreground">Subir nuevos logos PNG</p>
          </div>
        </Label>
        <Input
          id="logo-upload"
          type="file"
          accept=".png"
          multiple
          className="hidden"
          onChange={handleFileUpload}
        />
      </div>

      {availableLogos.length > 0 && (
        <div>
          <Label>Seleccionar Logo de Empresa</Label>
          <Select value={selectedLogo} onValueChange={(value) => {
            const logo = availableLogos.find(l => l.name === value);
            if (logo) {
              onLogoChange(logo.name, logo.url);
            }
          }}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona una empresa" />
            </SelectTrigger>
            <SelectContent>
              {availableLogos.map((logo) => (
                <SelectItem key={logo.name} value={logo.name}>
                  <div className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    {logo.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {selectedLogo && (
        <div className="mt-4">
          <Label>Logo seleccionado:</Label>
          <div className="mt-2 p-4 border rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white rounded border flex items-center justify-center">
                <img 
                  src={availableLogos.find(l => l.name === selectedLogo)?.url} 
                  alt={selectedLogo}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
              <span className="font-medium">{selectedLogo}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};