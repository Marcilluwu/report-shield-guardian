import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface FolderItem {
  isdir: boolean;
  name: string;
  path: string;
}

export const NewWorkValidation = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [expedientNumbers, setExpedientNumbers] = useState<number[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isValid, setIsValid] = useState<boolean | null>(null);

  useEffect(() => {
    fetchExistingExpedients();
  }, []);

  const fetchExistingExpedients = async () => {
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
      
      // Extraer números de expediente (números antes del punto)
      const numbers = data
        .filter(item => item.isdir)
        .map(item => {
          const match = item.name.match(/^(\d+)\./);
          return match ? parseInt(match[1]) : null;
        })
        .filter((num): num is number => num !== null)
        .sort((a, b) => a - b);

      setExpedientNumbers(numbers);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching expedients:', error);
      toast({
        title: 'Error de conexión',
        description: 'No se pudo obtener la lista de expedientes existentes',
        variant: 'destructive'
      });
      setLoading(false);
    }
  };

  const groupNumbersIntoRanges = (numbers: number[]): string => {
    if (numbers.length === 0) return 'Ninguno';
    
    const ranges: string[] = [];
    let start = numbers[0];
    let end = numbers[0];

    for (let i = 1; i < numbers.length; i++) {
      if (numbers[i] === end + 1) {
        end = numbers[i];
      } else {
        ranges.push(start === end ? `${start}` : `${start}-${end}`);
        start = numbers[i];
        end = numbers[i];
      }
    }
    ranges.push(start === end ? `${start}` : `${start}-${end}`);

    return ranges.join(', ');
  };

  const handleInputChange = (value: string) => {
    setInputValue(value);
    
    if (!value.trim()) {
      setIsValid(null);
      return;
    }

    const num = parseInt(value);
    if (isNaN(num)) {
      setIsValid(false);
      return;
    }

    const exists = expedientNumbers.includes(num);
    setIsValid(!exists);
  };

  const handleContinue = () => {
    if (isValid && inputValue.trim()) {
      navigate('/formulario', { state: { expedientNumber: inputValue.trim(), isNewWork: true } });
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-3xl mx-auto space-y-4">
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
            <CardTitle>Validación de Expediente - Nueva Obra</CardTitle>
            <CardDescription>
              Verifica que el número de expediente no exista previamente
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2">Cargando expedientes existentes...</span>
              </div>
            ) : (
              <>
                <div>
                  <Label className="text-base font-semibold">Expedientes Existentes</Label>
                  <div className="mt-2 p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground mb-2">
                      Rangos de expedientes ya registrados:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {expedientNumbers.length > 0 ? (
                        <Badge variant="secondary" className="text-base px-3 py-1">
                          {groupNumbersIntoRanges(expedientNumbers)}
                        </Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">No hay expedientes registrados</span>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="expedient">Número de Expediente Nuevo</Label>
                  <div className="flex gap-2 mt-2">
                    <div className="flex-1 relative">
                      <Input
                        id="expedient"
                        type="number"
                        value={inputValue}
                        onChange={(e) => handleInputChange(e.target.value)}
                        placeholder="Ingresa el número de expediente"
                        className={
                          isValid === null ? '' :
                          isValid ? 'border-green-500 focus-visible:ring-green-500' :
                          'border-destructive focus-visible:ring-destructive'
                        }
                      />
                      {isValid !== null && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          {isValid ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                          ) : (
                            <XCircle className="h-5 w-5 text-destructive" />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  {isValid === false && inputValue.trim() && (
                    <p className="text-sm text-destructive mt-2">
                      ⚠️ Este número de expediente ya existe. Por favor, elige otro.
                    </p>
                  )}
                  {isValid === true && (
                    <p className="text-sm text-green-600 mt-2">
                      ✓ Este número de expediente está disponible
                    </p>
                  )}
                </div>

                <Button
                  onClick={handleContinue}
                  disabled={!isValid || !inputValue.trim()}
                  className="w-full"
                  size="lg"
                >
                  Continuar al formulario
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
