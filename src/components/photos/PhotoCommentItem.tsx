import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Trash2 } from 'lucide-react';

export interface PhotoWithCommentUI {
  id: string;
  url: string;
  comment: string;
}

interface PhotoCommentItemProps {
  photo: PhotoWithCommentUI;
  onRemove: (id: string) => void;
  onCommentChange: (id: string, comment: string) => void;
}

// Componente memoizado para evitar rerenders innecesarios y pérdida de foco
export const PhotoCommentItem: React.FC<PhotoCommentItemProps> = React.memo(({ photo, onRemove, onCommentChange }) => {
  const [localComment, setLocalComment] = useState(photo.comment || '');
  const debounceRef = useRef<number | null>(null);

  // Mantener sincronizado cuando el comentario desde arriba cambie externamente
  useEffect(() => {
    setLocalComment(photo.comment || '');
  }, [photo.comment, photo.id]);

  // Debounce para no provocar rerender del padre en cada pulsación
  useEffect(() => {
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
    }
    debounceRef.current = window.setTimeout(() => {
      onCommentChange(photo.id, localComment);
    }, 300);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [localComment, onCommentChange, photo.id]);

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <img
          src={photo.url}
          alt="Preview de la foto"
          className="w-20 h-20 object-cover rounded-md"
        />
        <Button
          variant="destructive"
          size="sm"
          onClick={() => onRemove(photo.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      <div>
        <Label htmlFor={`comment-${photo.id}`}>Comentario</Label>
        <Textarea
          id={`comment-${photo.id}`}
          value={localComment}
          onChange={(e) => setLocalComment(e.target.value)}
          placeholder="Añadir comentario sobre esta foto..."
          autoFocus={false}
        />
      </div>
    </div>
  );
});

PhotoCommentItem.displayName = 'PhotoCommentItem';
