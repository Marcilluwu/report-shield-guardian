import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, FolderOpen } from 'lucide-react';

export const MainMenu = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl">Actas de Seguridad</CardTitle>
          <CardDescription>Selecciona el tipo de acta que deseas crear</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Button
            variant="outline"
            className="h-40 flex flex-col gap-4 hover:bg-primary/10 hover:border-primary"
            onClick={() => navigate('/nueva-obra')}
          >
            <FileText className="h-12 w-12" />
            <div className="text-center">
              <div className="font-semibold text-lg">Actas Nueva Obra</div>
              <div className="text-sm text-muted-foreground mt-1">
                Crear acta para una obra nueva
              </div>
            </div>
          </Button>

          <Button
            variant="outline"
            className="h-40 flex flex-col gap-4 hover:bg-primary/10 hover:border-primary"
            onClick={() => navigate('/obra-existente')}
          >
            <FolderOpen className="h-12 w-12" />
            <div className="text-center">
              <div className="font-semibold text-lg">Acta Obra Existente</div>
              <div className="text-sm text-muted-foreground mt-1">
                Continuar acta de una obra existente
              </div>
            </div>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
