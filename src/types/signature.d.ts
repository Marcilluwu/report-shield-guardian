// types/signature.d.ts
// ✅ Tipos TypeScript corregidos para el sistema de firmas

// Declaración de módulo para react-signature-canvas
declare module 'react-signature-canvas' {
  import { Component } from 'react';

  interface SignatureCanvasProps {
    velocityFilterWeight?: number;
    minWidth?: number;
    maxWidth?: number;
    minDistance?: number;
    backgroundColor?: string;
    penColor?: string;
    throttle?: number;
    canvasProps?: React.CanvasHTMLAttributes<HTMLCanvasElement>;
    clearOnResize?: boolean;
    onBegin?: (event: MouseEvent | Touch) => void;
    onEnd?: () => void;
  }

  export default class SignatureCanvas extends Component<SignatureCanvasProps> {
    clear(): void;
    isEmpty(): boolean;
    toDataURL(type?: string, encoderOptions?: number): string;
    toData(): Array<{
      x: number;
      y: number;
      pressure?: number;
      time: number;
    }[]>;
    fromDataURL(dataUrl: string, options?: { ratio?: number; width?: number; height?: number }): void;
    fromData(pointGroups: Array<Array<{
      x: number;
      y: number;
      pressure?: number;
      time: number;
    }>>): void;
    off(): void;
    on(): void;
    getCanvas(): HTMLCanvasElement;
    getTrimmedCanvas(): HTMLCanvasElement;
  }
}

// Interfaces para los datos de inspección
export interface InspectionData {
  id?: string;
  date: string;
  inspector: string;
  location: string;
  findings: string[];
  recommendations: string[];
  priority: 'low' | 'medium' | 'high';
  signature?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Estados de validación
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Configuración para la firma
export interface SignatureConfig {
  width: number;
  height: number;
  backgroundColor: string;
  penColor: string;
  minWidth: number;
  maxWidth: number;
}

// Opciones para generar PDF
export interface PDFOptions {
  filename?: string;
  orientation?: 'portrait' | 'landscape';
  format?: string;
  quality?: number;
  scale?: number;
}

// Configuración para html2canvas
export interface Html2CanvasOptions {
  scale: number;
  useCORS: boolean;
  allowTaint: boolean;
  backgroundColor: string;
  logging: boolean;
  removeContainer: boolean;
  imageTimeout: number;
  foreignObjectRendering?: boolean;
}

// Estado del proceso de generación de PDF
export interface PDFGenerationState {
  isGenerating: boolean;
  progress: number;
  error: string | null;
  success: boolean;
}

// Props para componentes de firma
export interface SignatureComponentProps {
  onSave?: (signature: string) => void;
  onClear?: () => void;
  disabled?: boolean;
  config?: Partial<SignatureConfig>;
}

// Resultado de operaciones con firma
export interface SignatureOperationResult {
  success: boolean;
  data?: string;
  error?: string;
}

// Utilidades de tipo
export type SignatureRef = React.RefObject<SignatureCanvas>;
export type PDFContentRef = React.RefObject<HTMLDivElement>;

// Estados de carga
export interface LoadingState {
  isLoading: boolean;
  message?: string;
}

// Tipos para toast notifications
export interface ToastMessage {
  title: string;
  description: string;
  variant?: 'default' | 'destructive';
}