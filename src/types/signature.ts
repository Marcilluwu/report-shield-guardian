// types/signature.ts
// ✅ Tipos mejorados para el componente de firma

import type SignatureCanvas from 'react-signature-canvas';

// Tipo para la referencia del canvas de firma
export type SignatureCanvasRef = SignatureCanvas | null;

// Interfaz para los datos de inspección
export interface InspectionData {
  date: string;
  inspector: string;
  location: string;
  findings: string[];
  recommendations: string[];
  priority: 'low' | 'medium' | 'high';
  signature?: string;
}

// Interfaz para el estado de la firma
export interface SignatureState {
  data: string;
  isEmpty: boolean;
  isValid: boolean;
}

// Opciones para la configuración del canvas
export interface SignatureCanvasOptions {
  width: number;
  height: number;
  backgroundColor: string;
  penColor: string;
  minWidth: number;
  maxWidth: number;
}

// Opciones para la generación de PDF
export interface PDFGenerationOptions {
  filename: string;
  orientation: 'portrait' | 'landscape';
  format: string;
  quality: number;
}

// Configuración para html2canvas
export interface Html2CanvasConfig {
  scale: number;
  useCORS: boolean;
  allowTaint: boolean;
  backgroundColor: string;
  logging: boolean;
  removeContainer: boolean;
  imageTimeout: number;
}

// Estado para el proceso de generación de PDF
export interface PDFGenerationState {
  isGenerating: boolean;
  progress: number;
  error: string | null;
  success: boolean;
}

// Resultado de la validación
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}