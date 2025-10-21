import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, Folder, Loader2, AlertCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface FolderItem {
  isdir: boolean;
  name: string;
  path: string;
}

export const ExistingWorkSelection = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    fetchFolders();
  }, []);

  const fetchFolders = async () => {
    try {
      setLoading(true);
      const response = await fetch('https://n8n.n8n.instalia.synology.me/webhook/Lista_Carpetas', {
        method: 'GET',
        headers: {
          'psswd': '73862137816273861283dhvhfgdvgf27384rtfgcuyefgc7ewufgqwsdafsdf'
        }
      });

      if (!response.ok) {
        throw new Error('Error al obtener lista de carpetas');
      }

      const data: FolderItem[] = await response.json();
      const validFolders = data.filter(item => item.isdir && !item.name.startsWith('#'));
      setFolders(validFolders);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching folders:', error);
      toast({
        title: 'Error de conexión',
        description: 'No se pudo obtener la lista de carpetas',
        variant: 'destructive'
      });
      setLoading(false);
    }
  };

  const handleFolderSelect = async (folderName: string) => {
    setSelectedFolder(folderName);
    setLoadingData(true);

    try {
      const response = await fetch(
        `https://n8n.n8n.instalia.synology.me/webhook/fetch_txt?folder=${encodeURIComponent(folderName)}`,
        {
          method: 'GET',
          headers: {
            'psswd': '73862137816273861283dhvhfgdvgf27384rtfgcuyefgc7ewufgqwsdafsdf'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Error al cargar datos del archivo');
      }

      const textData = await response.text();

      toast({
        title: 'Datos cargados',
        description: 'Los datos del acta anterior se cargarán automáticamente'
      });

      // Navegar al formulario con los datos
      navigate('/formulario', { 
        state: { 
          folderName,
          textData,
          isNewWork: false 
        } 
      });
    } catch (error) {
      console.error('Error loading folder data:', error);
      toast({
        title: 'Error al cargar datos',
        description: 'No se pudieron cargar los datos automáticamente. Podrás usar "Carga acta anterior" como alternativa.',
        variant: 'destructive'
      });
      
      // Navegar al formulario sin datos precargados
      navigate('/formulario', { 
        state: { 
          folderName,
          isNewWork: false,
          loadFailed: true 
        } 
      });
    } finally {
      setLoadingData(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-4">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver al menú
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Seleccionar Obra Existente</CardTitle>
            <CardDescription>
              Selecciona una carpeta para cargar los datos del acta anterior
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2">Cargando carpetas...</span>
              </div>
            ) : folders.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No se encontraron carpetas de obras</p>
              </div>
            ) : (
              <ScrollArea className="h-[500px] pr-4">
                <div className="grid gap-3">
                  {folders.map((folder) => (
                    <Button
                      key={folder.path}
                      variant={selectedFolder === folder.name ? "default" : "outline"}
                      className="h-auto py-4 px-4 justify-start text-left"
                      onClick={() => handleFolderSelect(folder.name)}
                      disabled={loadingData}
                    >
                      <Folder className="h-5 w-5 mr-3 flex-shrink-0" />
                      <span className="flex-1">{folder.name}</span>
                      {loadingData && selectedFolder === folder.name && (
                        <Loader2 className="h-4 w-4 animate-spin ml-2" />
                      )}
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
