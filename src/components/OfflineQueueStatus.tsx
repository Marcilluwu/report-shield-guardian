/**
 * Componente para mostrar el estado detallado de la cola de sincronización
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  Clock,
  ChevronDown,
  ChevronUp,
  Trash2
} from 'lucide-react';
import { useOfflineForm } from '@/hooks/useOfflineForm';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

export const OfflineQueueStatus = () => {
  const { pendingCount, pendingEntries, retrySync, isOnline } = useOfflineForm();
  const [isOpen, setIsOpen] = useState(false);

  if (pendingCount === 0) {
    return null;
  }

  return (
    <Card className="border-orange-200 bg-orange-50/50">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-3">
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between cursor-pointer">
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5 text-orange-500" />
                Cola de Sincronización
                <Badge variant="secondary" className="ml-2">
                  {pendingCount} pendiente{pendingCount > 1 ? 's' : ''}
                </Badge>
              </CardTitle>
              <Button variant="ghost" size="sm">
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </CollapsibleTrigger>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="space-y-3">
            {pendingEntries.map((entry) => (
              <div
                key={entry.localId}
                className="border rounded-lg p-3 bg-white space-y-2"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={
                          entry.status === 'pending' ? 'secondary' :
                          entry.status === 'syncing' ? 'default' :
                          entry.status === 'failed' ? 'destructive' :
                          'outline'
                        }
                        className="text-xs"
                      >
                        {entry.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                        {entry.status === 'syncing' && <RefreshCw className="h-3 w-3 mr-1 animate-spin" />}
                        {entry.status === 'failed' && <XCircle className="h-3 w-3 mr-1" />}
                        {entry.status === 'success' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                        {entry.status === 'pending' && 'Pendiente'}
                        {entry.status === 'syncing' && 'Sincronizando'}
                        {entry.status === 'failed' && 'Fallido'}
                        {entry.status === 'success' && 'Éxito'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(entry.timestamp), "PPp", { locale: es })}
                      </span>
                    </div>
                    
                    <p className="text-sm font-medium mt-2">
                      {entry.method} {entry.endpoint}
                    </p>
                    
                    {entry.error && (
                      <p className="text-xs text-red-600 mt-1">
                        Error: {entry.error}
                      </p>
                    )}
                    
                    {entry.retryCount > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Reintentos: {entry.retryCount}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {isOnline && (
              <Button
                onClick={retrySync}
                className="w-full"
                variant="outline"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Reintentar Sincronización
              </Button>
            )}
            
            {!isOnline && (
              <div className="text-center text-sm text-muted-foreground p-3 bg-orange-100 rounded">
                Sin conexión. La sincronización se iniciará automáticamente cuando se recupere la conexión.
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
