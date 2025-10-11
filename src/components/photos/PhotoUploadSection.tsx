import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Upload } from 'lucide-react';
import { PhotoCommentItem, PhotoWithCommentUI } from './PhotoCommentItem';

interface PhotoUploadSectionProps {
  title: string;
  inputId: string;
  photos: PhotoWithCommentUI[];
  onUpload: (files: FileList | null) => void;
  onRemove: (id: string) => void;
  onCommentChange: (id: string, comment: string) => void;
}

export const PhotoUploadSection: React.FC<PhotoUploadSectionProps> = ({
  title,
  inputId,
  photos,
  onUpload,
  onRemove,
  onCommentChange,
}) => {
  return (
    <Card className="shadow-safety">
      <CardHeader>
        <CardTitle className="text-primary">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {/* Botón para galería */}
          <div>
            <Label htmlFor={`${inputId}-gallery`} className="cursor-pointer">
              <div className="border-2 border-dashed border-primary/30 rounded-lg p-4 text-center hover:border-primary/50 transition-colors">
                <Upload className="mx-auto h-6 w-6 text-primary mb-1" />
                <p className="text-xs text-muted-foreground">Galería</p>
              </div>
            </Label>
            <Input
              id={`${inputId}-gallery`}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => onUpload(e.target.files)}
            />
          </div>

          {/* Botón para cámara */}
          <div>
            <Label htmlFor={`${inputId}-camera`} className="cursor-pointer">
              <div className="border-2 border-dashed border-primary/30 rounded-lg p-4 text-center hover:border-primary/50 transition-colors">
                <Upload className="mx-auto h-6 w-6 text-primary mb-1" />
                <p className="text-xs text-muted-foreground">Cámara</p>
              </div>
            </Label>
            <Input
              id={`${inputId}-camera`}
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              className="hidden"
              onChange={(e) => onUpload(e.target.files)}
            />
          </div>
        </div>

        {photos.map((photo) => (
          <PhotoCommentItem
            key={photo.id}
            photo={photo}
            onRemove={onRemove}
            onCommentChange={onCommentChange}
          />
        ))}
      </CardContent>
    </Card>
  );
};
