// hooks/useSignature.ts
// ✅ Hook personalizado optimizado para manejar firmas digitales

import { useRef, useState, useCallback } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { toast } from '@/hooks/use-toast';

interface UseSignatureOptions {
  onSignatureSave?: (signature: string) => void;
  onSignatureClear?: () => void;
  validateOnSave?: boolean;
}

interface UseSignatureReturn {
  signatureRef: React.RefObject<SignatureCanvas>;
  signatureData: string;
  isSignatureSaved: boolean;
  isEmpty: boolean;
  clearSignature: () => void;
  saveSignature: () => boolean;
  validateSignature: () => boolean;
  resetSignature: () => void;
}

export const useSignature = (options: UseSignatureOptions = {}): UseSignatureReturn => {
  const {
    onSignatureSave,
    onSignatureClear,
    validateOnSave = true
  } = options;

  // ✅ Referencia correctamente tipada
  const signatureRef = useRef<SignatureCanvas>(null);
  const [signatureData, setSignatureData] = useState<string>('');
  const [isSignatureSaved, setIsSignatureSaved] = useState<boolean>(false);
  const [isEmpty, setIsEmpty] = useState<boolean>(true);

  // ✅ Función para verificar si está vacía
  const checkIfEmpty = useCallback((): boolean => {
    if (!signatureRef.current) return true;
    return signatureRef.current.isEmpty();
  }, []);

  // ✅ Función para limpiar la firma
  const clearSignature = useCallback(() => {
    try {
      if (!signatureRef.current) {
        console.warn('Referencia de firma no disponible para limpiar');
        return;
      }

      signatureRef.current.clear();
      setSignatureData('');
      setIsSignatureSaved(false);
      setIsEmpty(true);
      
      // Callback opcional
      onSignatureClear?.();
      
      toast({
        title: 'Firma limpiada',
        description: 'La firma ha sido eliminada correctamente.',
      });
    } catch (error) {
      console.error('Error al limpiar la firma:', error);
      toast({
        title: 'Error',
        description: 'No se pudo limpiar la firma.',
        variant: 'destructive',
      });
    }
  }, [onSignatureClear]);

  // ✅ Función para guardar la firma
  const saveSignature = useCallback((): boolean => {
    try {
      // Validar referencia
      if (!signatureRef.current) {
        toast({
          title: 'Error',
          description: 'Referencia de firma no disponible.',
          variant: 'destructive',
        });
        return false;
      }

      // Verificar si está vacía
      const currentlyEmpty = signatureRef.current.isEmpty();
      if (currentlyEmpty && validateOnSave) {
        toast({
          title: 'Firma vacía',
          description: 'Por favor, dibuje su firma antes de guardar.',
          variant: 'destructive',
        });
        return false;
      }

      // Obtener datos de la firma
      const dataURL = signatureRef.current.toDataURL('image/png', 1.0);
      
      // Validar datos
      if (!dataURL || dataURL === 'data:,' || dataURL === 'data:image/png;base64,') {
        toast({
          title: 'Error',
          description: 'No se pudo capturar la firma. Intente dibujar nuevamente.',
          variant: 'destructive',
        });
        return false;
      }

      // Guardar estado
      setSignatureData(dataURL);
      setIsSignatureSaved(true);
      setIsEmpty(currentlyEmpty);
      
      // Callback opcional
      onSignatureSave?.(dataURL);
      
      toast({
        title: 'Firma guardada',
        description: 'La firma se ha guardado correctamente.',
      });
      
      return true;
    } catch (error) {
      console.error('Error al guardar la firma:', error);
      toast({
        title: 'Error',
        description: 'No se pudo guardar la firma.',
        variant: 'destructive',
      });
      return false;
    }
  }, [onSignatureSave, validateOnSave]);

  // ✅ Función para validar la firma
  const validateSignature = useCallback((): boolean => {
    // Verificar si hay datos guardados
    if (!signatureData || !isSignatureSaved) {
      toast({
        title: 'Firma requerida',
        description: 'Por favor, dibuje y guarde su firma antes de continuar.',
        variant: 'destructive',
      });
      return false;
    }

    // Verificar que no esté vacía
    if (isEmpty) {
      toast({
        title: 'Firma inválida',
        description: 'La firma guardada parece estar vacía.',
        variant: 'destructive',
      });
      return false;
    }

    return true;
  }, [signatureData, isSignatureSaved, isEmpty]);

  // ✅ Función para resetear completamente
  const resetSignature = useCallback(() => {
    clearSignature();
    setSignatureData('');
    setIsSignatureSaved(false);
    setIsEmpty(true);
  }, [clearSignature]);

  return {
    signatureRef,
    signatureData,
    isSignatureSaved,
    isEmpty,
    clearSignature,
    saveSignature,
    validateSignature,
    resetSignature,
  };
};