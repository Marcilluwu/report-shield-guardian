import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, FolderOpen, History } from 'lucide-react';

export const MainMenu = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-safety-green-light to-background flex items-center justify-center p-4">
      <div className="w-full max-w-3xl space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-primary mb-2">
            Actas de Seguridad
          </h1>
          <p className="text-muted-foreground text-lg">
            Selecciona el tipo de acta que deseas crear
          </p>
        </div>

        <Card className="shadow-safety">
          <CardContent className="pt-6">
            <div className="grid gap-6 md:grid-cols-3">
              <Button
                variant="outline"
                className="h-48 flex flex-col gap-4 hover:bg-primary/10 hover:border-primary transition-all shadow-safety"
                onClick={() => navigate('/nueva-obra')}
              >
                <FileText className="h-16 w-16 text-primary" />
                <div className="text-center">
                  <div className="font-semibold text-xl text-primary mb-2">Actas Nueva Obra</div>
                  <div className="text-sm text-muted-foreground">
                    Crear acta para una obra nueva
                  </div>
                </div>
              </Button>

              <Button
                variant="outline"
                className="h-48 flex flex-col gap-4 hover:bg-primary/10 hover:border-primary transition-all shadow-safety"
                onClick={() => navigate('/obra-existente')}
              >
                <FolderOpen className="h-16 w-16 text-primary" />
                <div className="text-center">
                  <div className="font-semibold text-xl text-primary mb-2">Acta Obra Existente</div>
                  <div className="text-sm text-muted-foreground">
                    Continuar acta de una obra existente
                  </div>
                </div>
              </Button>

              <Button
                variant="outline"
                className="h-48 flex flex-col gap-4 hover:bg-primary/10 hover:border-primary transition-all shadow-safety"
                onClick={() => navigate('/inspecciones-previas')}
              >
                <History className="h-16 w-16 text-primary" />
                <div className="text-center">
                  <div className="font-semibold text-xl text-primary mb-2">Inspecciones Previas</div>
                  <div className="text-sm text-muted-foreground">
                    Ver actas anteriores
                  </div>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
