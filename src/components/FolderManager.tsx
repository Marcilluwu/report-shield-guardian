import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FolderPlus, Folder } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface FolderManagerProps {
  selectedFolder: string;
  onFolderChange: (folder: string) => void;
  expedientNumber?: string;
  workName?: string;
}

export const FolderManager: React.FC<FolderManagerProps> = ({ 
  selectedFolder, 
  onFolderChange,
  expedientNumber,
  workName 
}) => {
  const [folders, setFolders] = useState<string[]>([]);

  useEffect(() => {
    // Cargar carpetas existentes del localStorage
    const existingFolders = JSON.parse(localStorage.getItem('reportFolders') || '["Reportes"]');
    setFolders(existingFolders);
    if (!selectedFolder && existingFolders.length > 0) {
      onFolderChange(existingFolders[0]);
    }
  }, [selectedFolder, onFolderChange]);

  const createFolderFromWorkData = () => {
    if (!expedientNumber?.trim() || !workName?.trim()) {
      toast({
        title: 'Error',
        description: 'Debes completar el N° de Expediente y el Nombre de Obra',
        variant: 'destructive'
      });
      return;
    }

    const folderName = `${expedientNumber.trim()}. ${workName.trim()}`;
    
    if (folders.includes(folderName)) {
      toast({
        title: 'Carpeta ya existe',
        description: `La carpeta "${folderName}" ya fue creada`
      });
      onFolderChange(folderName);
      return;
    }

    const updatedFolders = [...folders, folderName];
    setFolders(updatedFolders);
    localStorage.setItem('reportFolders', JSON.stringify(updatedFolders));
    onFolderChange(folderName);
    
    toast({
      title: 'Carpeta creada',
      description: `La carpeta "${folderName}" ha sido creada correctamente`
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Carpeta de destino</Label>
        <div className="flex gap-2">
          <Select value={selectedFolder} onValueChange={onFolderChange}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Selecciona una carpeta" />
            </SelectTrigger>
            <SelectContent>
              {folders.map((folder) => (
                <SelectItem key={folder} value={folder}>
                  <div className="flex items-center gap-2">
                    <Folder className="h-4 w-4" />
                    {folder}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button 
            variant="outline" 
            onClick={createFolderFromWorkData}
            disabled={!expedientNumber || !workName}
          >
            <FolderPlus className="h-4 w-4 mr-2" />
            Nombre Obra
          </Button>
        </div>
        {expedientNumber && workName && (
          <p className="text-xs text-muted-foreground mt-2">
            Vista previa: {expedientNumber}. {workName}
          </p>
        )}
      </div>
    </div>
  );
};