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
        <div>
          <Label htmlFor={inputId} className="cursor-pointer">
            <div className="border-2 border-dashed border-primary/30 rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
              <Upload className="mx-auto h-8 w-8 text-primary mb-2" />
              <p className="text-sm text-muted-foreground">Subir fotos</p>
            </div>
          </Label>
          <Input
            id={inputId}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => onUpload(e.target.files)}
          />
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
