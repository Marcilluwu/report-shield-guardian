import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Upload, Image as ImageIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { FileSystemStorage } from '@/utils/fileSystemStorage';
import { ConfigManager } from '@/utils/configManager';

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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      if (file.type === 'image/png') {
        try {
          const reader = new FileReader();
          await new Promise<void>((resolve, reject) => {
            reader.onload = async (e) => {
              try {
                const logoName = file.name.replace('.png', '');
                const logoUrl = e.target?.result as string;
                
                // Intentar guardar en File System si está disponible
                if (ConfigManager.isUsingFileSystemAPI()) {
                  const blob = await fetch(logoUrl).then(r => r.blob());
                  const saved = await FileSystemStorage.saveLogo(blob, file.name);
                  
                  if (saved) {
                    console.log(`Logo guardado en Logos/${file.name}`);
                  }
                }
                
                // Guardar también en localStorage para referencia rápida
                const existingLogos = JSON.parse(localStorage.getItem('uploadedLogos') || '[]');
                const newLogo = { name: logoName, url: logoUrl };
                const updatedLogos = existingLogos.filter((logo: any) => logo.name !== logoName);
                updatedLogos.push(newLogo);
                
                localStorage.setItem('uploadedLogos', JSON.stringify(updatedLogos));
                setAvailableLogos(updatedLogos);
                
                // Seleccionar automáticamente el logo recién subido
                onLogoChange(logoName, logoUrl);
                
                toast({
                  title: 'Logo guardado correctamente',
                  description: `${logoName} está disponible para usar`
                });
                
                resolve();
              } catch (error) {
                reject(error);
              }
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
        } catch (error) {
          console.error('Error guardando logo:', error);
          toast({
            title: 'Error al guardar logo',
            description: 'No se pudo guardar el logo en el sistema',
            variant: 'destructive'
          });
        }
      } else {
        toast({
          title: 'Formato no válido',
          description: 'Solo se permiten archivos PNG',
          variant: 'destructive'
        });
      }
    }
    
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
              <div className="w-16 h-16 bg-white rounded border flex items-center justify-center p-2">
                <img 
                  src={availableLogos.find(l => l.name === selectedLogo)?.url} 
                  alt={selectedLogo}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
              <div>
                <span className="font-medium block">{selectedLogo}</span>
                <span className="text-sm text-muted-foreground">Logo activo para el reporte</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};