import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Image as ImageIcon } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const BASE_URL = 'https://n8n.n8n.instalia.synology.me/webhook';
const API_HEADER = {
  'X-API-Key': 'n8n-webhook-2024-secure-key-xyz789'
};

interface LogoSelectorProps {
  selectedLogo: string;
  onLogoChange: (logoName: string, logoUrl: string) => void;
}

interface LogoFile {
  isdir: boolean;
  name: string;
  path: string;
}

export const LogoSelector: React.FC<LogoSelectorProps> = ({ selectedLogo, onLogoChange }) => {
  const [availableLogos, setAvailableLogos] = useState<LogoFile[]>([]);
  const [logoUrls, setLogoUrls] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(false);

  // Función para cargar la lista de logos desde el webhook
  const loadLogos = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/logos_fetch`, {
        headers: API_HEADER,
      });
      
      if (!response.ok) throw new Error('Error al obtener logos');
      
      const data: LogoFile[] = await response.json();
      // Filtrar solo archivos (no directorios)
      const logoFiles = data.filter(item => !item.isdir && item.name.toLowerCase().endsWith('.png'));
      setAvailableLogos(logoFiles);
      
      // Si hay un logo seleccionado, cargarlo
      if (selectedLogo) {
        const selectedLogoFile = logoFiles.find(logo => logo.name === selectedLogo);
        if (selectedLogoFile) {
          await fetchLogoImage(selectedLogoFile);
        }
      }
    } catch (error) {
      console.error('Error cargando logos:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los logos disponibles',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Función para obtener la imagen de un logo específico
  const fetchLogoImage = async (logo: LogoFile) => {
    try {
      const response = await fetch(`${BASE_URL}/logo?path=${encodeURIComponent(logo.path)}`, {
        headers: API_HEADER,
      });
      
      if (!response.ok) throw new Error('Error al obtener imagen del logo');
      
      const blob = await response.blob();
      const reader = new FileReader();
      
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        setLogoUrls(prev => new Map(prev).set(logo.name, dataUrl));
        onLogoChange(logo.name, dataUrl);
      };
      
      reader.readAsDataURL(blob);
    } catch (error) {
      console.error('Error cargando imagen del logo:', error);
      toast({
        title: 'Error',
        description: `No se pudo cargar el logo ${logo.name}`,
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    loadLogos();
  }, []);

  const handleLogoSelect = async (logoName: string) => {
    const logo = availableLogos.find(l => l.name === logoName);
    if (!logo) return;

    // Si ya tenemos la URL en caché, usarla
    if (logoUrls.has(logoName)) {
      onLogoChange(logoName, logoUrls.get(logoName)!);
      return;
    }

    // Si no, cargarla desde el webhook
    await fetchLogoImage(logo);
  };

  return (
    <div className="space-y-4">
      {availableLogos.length > 0 && (
        <div>
          <Label>Seleccionar Logo de Empresa</Label>
          <Select 
            value={selectedLogo} 
            onValueChange={handleLogoSelect}
            disabled={loading}
          >
            <SelectTrigger>
              <SelectValue placeholder={loading ? "Cargando logos..." : "Selecciona una empresa"} />
            </SelectTrigger>
            <SelectContent>
              {availableLogos.map((logo) => (
                <SelectItem key={logo.name} value={logo.name}>
                  <div className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    {logo.name.replace('.png', '')}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {selectedLogo && logoUrls.has(selectedLogo) && (
        <div className="mt-4">
          <Label>Logo seleccionado:</Label>
          <div className="mt-2 p-4 border rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 bg-white rounded border flex items-center justify-center p-2">
                <img 
                  src={logoUrls.get(selectedLogo)} 
                  alt={selectedLogo}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
              <div>
                <span className="font-medium block">{selectedLogo.replace('.png', '')}</span>
                <span className="text-sm text-muted-foreground">Logo activo para el reporte</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};