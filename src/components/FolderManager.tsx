import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { FolderPlus, Folder } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface FolderManagerProps {
  selectedFolder: string;
  onFolderChange: (folder: string) => void;
}

export const FolderManager: React.FC<FolderManagerProps> = ({ selectedFolder, onFolderChange }) => {
  const [folders, setFolders] = useState<string[]>([]);
  const [newFolderName, setNewFolderName] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    // Cargar carpetas existentes del localStorage
    const existingFolders = JSON.parse(localStorage.getItem('reportFolders') || '["Reportes"]');
    setFolders(existingFolders);
    if (!selectedFolder && existingFolders.length > 0) {
      onFolderChange(existingFolders[0]);
    }
  }, [selectedFolder, onFolderChange]);

  const createFolder = () => {
    if (!newFolderName.trim()) {
      toast({
        title: 'Error',
        description: 'El nombre de la carpeta no puede estar vacío',
        variant: 'destructive'
      });
      return;
    }

    if (folders.includes(newFolderName.trim())) {
      toast({
        title: 'Error',
        description: 'Ya existe una carpeta con ese nombre',
        variant: 'destructive'
      });
      return;
    }

    const updatedFolders = [...folders, newFolderName.trim()];
    setFolders(updatedFolders);
    localStorage.setItem('reportFolders', JSON.stringify(updatedFolders));
    onFolderChange(newFolderName.trim());
    setNewFolderName('');
    setIsDialogOpen(false);
    
    toast({
      title: 'Carpeta creada',
      description: `La carpeta "${newFolderName.trim()}" ha sido creada correctamente`
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
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon">
                <FolderPlus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear nueva carpeta</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="folder-name">Nombre de la carpeta</Label>
                  <Input
                    id="folder-name"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="Ej: Proyecto ABC"
                    onKeyPress={(e) => e.key === 'Enter' && createFolder()}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={createFolder}>
                    Crear carpeta
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
};