import { Document, Packer, Paragraph, TextRun, ImageRun, HeadingLevel, AlignmentType, BorderStyle } from 'docx';
import { saveAs } from 'file-saver';
import { FileSystemStorage } from './fileSystemStorage';
import { ConfigManager } from './configManager';

interface Worker {
  id: string;
  name: string;
  dni: string;
  category: string;
  company: string;
}

interface EPIItem {
  id: string;
  name: string;
  checked: boolean;
}

interface SafetyMeasureItem {
  id: string;
  name: string;
  checked: boolean;
}

interface PhotoWithComment {
  id: string;
  file: File;
  comment: string;
  url: string;
}

interface VanStatus {
  id: string;
  licensePlate: string;
  photos: PhotoWithComment[];
}

interface InspectionData {
  expedientNumber: string;
  inspector: {
    name: string;
    email: string;
  };
  work: {
    name: string;
    location: string;
    promotingCompany: string;
  };
  workers: Worker[];
  episReviewed: EPIItem[];
  safetyMeasures: SafetyMeasureItem[];
  workEnvironment: {
    photos: PhotoWithComment[];
  };
  toolsStatus: {
    photos: PhotoWithComment[];
  };
  vans: VanStatus[];
  generalObservations: string;
}

export async function generateDocx(
  data: InspectionData, 
  signatureName: string, 
  logoUrl?: string, 
  folderName?: string,
  signatureDataUrl?: string,
  fileName?: string
): Promise<Blob> {
  try {
    // Convertir imágenes a buffer
    const imageBuffers: { [key: string]: ArrayBuffer } = {};
    
    // Cargar logo si está disponible
    let logoBuffer: ArrayBuffer | null = null;
    if (logoUrl) {
      try {
        const logoResponse = await fetch(logoUrl);
        logoBuffer = await logoResponse.arrayBuffer();
      } catch (error) {
        console.warn('Error cargando logo:', error);
      }
    }

    // Cargar firma si está disponible
    let signatureBuffer: ArrayBuffer | null = null;
    if (signatureDataUrl) {
      try {
        const signatureResponse = await fetch(signatureDataUrl);
        signatureBuffer = await signatureResponse.arrayBuffer();
      } catch (error) {
        console.warn('Error cargando firma:', error);
      }
    }

    // Recopilar todas las fotos en el orden correcto
    const allPhotos = [
      ...data.workEnvironment.photos,
      ...data.toolsStatus.photos,
      ...data.vans.flatMap(van => van.photos)
    ];

    // Procesar todas las fotos en paralelo
    const photoPromises = allPhotos.map(async (photo) => {
      try {
        const response = await fetch(photo.url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const buffer = await response.arrayBuffer();
        return { id: photo.id, buffer, success: true };
      } catch (error) {
        console.error(`Error cargando foto ${photo.id}:`, error);
        return { id: photo.id, buffer: null, success: false };
      }
    });

    const photoResults = await Promise.all(photoPromises);
    photoResults.forEach(result => {
      if (result.success && result.buffer) {
        imageBuffers[result.id] = result.buffer;
      }
    });

    // Crear elementos del documento
    const documentChildren: Paragraph[] = [];

    // === HEADER: Logo y título verde ===
    if (logoBuffer) {
      documentChildren.push(
        new Paragraph({
          children: [
            new ImageRun({
              data: logoBuffer,
              transformation: { width: 64, height: 64 },
              type: "jpg"
            })
          ],
          alignment: AlignmentType.LEFT,
          spacing: { after: 200 }
        })
      );
    }

    documentChildren.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "Acta de Revisión, Pruebas Hidrostáticas y Recargas de Equipos Contraincendios",
            bold: true,
            size: 32, // 16pt
            color: "4a7c59"
          })
        ],
        spacing: { after: 300 }
      })
    );

    // === SECCIÓN 1: Datos de la inspección ===
    documentChildren.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "1. Datos de la inspección",
            bold: true,
            size: 26, // 13pt
            color: "4a7c59"
          })
        ],
        spacing: { before: 200, after: 160 }
      })
    );

    if (data.expedientNumber) {
      documentChildren.push(
        new Paragraph({
          children: [
            new TextRun({ text: "N° de Expediente: ", bold: true, size: 22 }),
            new TextRun({ text: data.expedientNumber, size: 22 })
          ],
          spacing: { after: 120 }
        })
      );
    }

    documentChildren.push(
      new Paragraph({
        children: [
          new TextRun({ text: "Promotor: ", bold: true, size: 22 }),
          new TextRun({ text: data.work.promotingCompany, size: 22 })
        ],
        spacing: { after: 120 }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "Proyecto: ", bold: true, size: 22 }),
          new TextRun({ text: data.work.name, size: 22 })
        ],
        spacing: { after: 120 }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "Emplazamiento: ", bold: true, size: 22 }),
          new TextRun({ text: data.work.location, size: 22 })
        ],
        spacing: { after: 120 }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "Inspector: ", bold: true, size: 22 }),
          new TextRun({ text: data.inspector.name, size: 22 })
        ],
        spacing: { after: 120 }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "Email del inspector: ", bold: true, size: 22 }),
          new TextRun({ text: data.inspector.email, size: 22 })
        ],
        spacing: { after: 120 }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "Fecha: ", bold: true, size: 22 }),
          new TextRun({ text: new Date().toLocaleDateString('es-ES'), size: 22 })
        ],
        spacing: { after: 300 }
      })
    );

    // === SECCIÓN 2: Participantes ===
    if (data.workers.length > 0) {
      documentChildren.push(
        new Paragraph({
          children: [
            new TextRun({
              text: "2. Participantes",
              bold: true,
              size: 24, // 12pt
              color: "333333"
            })
          ],
          spacing: { before: 200, after: 120 }
        })
      );

      data.workers.forEach((worker, index) => {
        documentChildren.push(
          new Paragraph({
            children: [
              new TextRun({ text: `Operario ${index + 1}: `, bold: true, size: 20 }),
              new TextRun({ text: `${worker.name}, ${worker.company}, DNI: ${worker.dni}`, size: 20 })
            ],
            spacing: { after: 100 }
          })
        );
      });
    }

    // === SECCIÓN 3: Medidas de Seguridad ===
    if (data.safetyMeasures && data.safetyMeasures.length > 0) {
      documentChildren.push(
        new Paragraph({
          children: [
            new TextRun({
              text: "3. Medidas de Seguridad Implementadas",
              bold: true,
              size: 26, // 13pt
              color: "4a7c59"
            })
          ],
          spacing: { before: 300, after: 160 }
        })
      );

      data.safetyMeasures.forEach((measure) => {
        documentChildren.push(
          new Paragraph({
            children: [
              new TextRun({ text: measure.name, bold: true, size: 20 }),
              new TextRun({ text: " - ", size: 20 }),
              new TextRun({ text: measure.checked ? "Correcto" : "No implementado", size: 20 })
            ],
            spacing: { after: 80 }
          })
        );
      });
    }

    // === SECCIÓN 4: Entorno de la Obra (fotos) ===
    if (data.workEnvironment.photos.length > 0) {
      documentChildren.push(
        new Paragraph({
          children: [
            new TextRun({
              text: "4. Entorno de la Obra",
              bold: true,
              size: 28, // 14pt
              color: "4a7c59"
            })
          ],
          spacing: { before: 400, after: 240 },
          pageBreakBefore: true
        })
      );

      data.workEnvironment.photos.forEach((photo, index) => {
        if (!imageBuffers[photo.id]) return;

        documentChildren.push(
          new Paragraph({
            children: [
              new TextRun({
                text: photo.comment || `Foto ${index + 1}`,
                bold: true,
                size: 20
              })
            ],
            spacing: { after: 120 }
          })
        );

        documentChildren.push(
          new Paragraph({
            children: [
              new ImageRun({
                data: imageBuffers[photo.id],
                transformation: { width: 400, height: 300 },
                type: "jpg"
              })
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 300 }
          })
        );
      });
    }

    // === SECCIÓN 5: Estado de las Herramientas (fotos) ===
    if (data.toolsStatus.photos.length > 0) {
      documentChildren.push(
        new Paragraph({
          children: [
            new TextRun({
              text: "5. Estado de las Herramientas",
              bold: true,
              size: 28,
              color: "4a7c59"
            })
          ],
          spacing: { before: 400, after: 240 },
          pageBreakBefore: true
        })
      );

      data.toolsStatus.photos.forEach((photo, index) => {
        if (!imageBuffers[photo.id]) return;

        documentChildren.push(
          new Paragraph({
            children: [
              new TextRun({
                text: photo.comment || `Foto ${index + 1}`,
                bold: true,
                size: 20
              })
            ],
            spacing: { after: 120 }
          })
        );

        documentChildren.push(
          new Paragraph({
            children: [
              new ImageRun({
                data: imageBuffers[photo.id],
                transformation: { width: 400, height: 300 },
                type: "jpg"
              })
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 300 }
          })
        );
      });
    }

    // === SECCIÓN 6: Estado de las Furgonetas (fotos) ===
    const vansWithPhotos = data.vans.filter(van => van.photos.length > 0);
    if (vansWithPhotos.length > 0) {
      let firstVan = true;
      
      vansWithPhotos.forEach((van, vanIndex) => {
        if (firstVan) {
          documentChildren.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: "6. Estado de las Furgonetas",
                  bold: true,
                  size: 28,
                  color: "4a7c59"
                })
              ],
              spacing: { before: 400, after: 240 },
              pageBreakBefore: true
            })
          );
          firstVan = false;
        }

        documentChildren.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `Matrícula de la furgoneta ${vanIndex + 1}: ${van.licensePlate || 'Sin especificar'}`,
                bold: true,
                size: 24,
                color: "333333"
              })
            ],
            spacing: { before: 300, after: 160 }
          })
        );

        van.photos.forEach((photo, photoIndex) => {
          if (!imageBuffers[photo.id]) return;

          documentChildren.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: photo.comment || `Foto ${photoIndex + 1}`,
                  bold: true,
                  size: 20
                })
              ],
              spacing: { after: 120 }
            })
          );

          documentChildren.push(
            new Paragraph({
              children: [
                new ImageRun({
                  data: imageBuffers[photo.id],
                  transformation: { width: 400, height: 300 },
                  type: "jpg"
                })
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 300 }
            })
          );
        });
      });
    }

    // === SECCIÓN 7: Observaciones Generales ===
    if (data.generalObservations && data.generalObservations.trim()) {
      documentChildren.push(
        new Paragraph({
          children: [
            new TextRun({
              text: "7. Observaciones Generales",
              bold: true,
              size: 28,
              color: "4a7c59"
            })
          ],
          spacing: { before: 400, after: 240 },
          pageBreakBefore: true
        })
      );

      documentChildren.push(
        new Paragraph({
          children: [
            new TextRun({
              text: data.generalObservations,
              size: 22
            })
          ],
          spacing: { after: 300 }
        })
      );
    }

    // === FIRMA ===
    documentChildren.push(
      new Paragraph({
        text: "",
        spacing: { before: 400 }
      })
    );

    documentChildren.push(
      new Paragraph({
        children: [
          new TextRun({ text: "Firma de: ", bold: true, size: 22 }),
          new TextRun({ text: signatureName, size: 22 })
        ],
        spacing: { after: 200 }
      })
    );

    if (signatureBuffer) {
      documentChildren.push(
        new Paragraph({
          children: [
            new ImageRun({
              data: signatureBuffer,
              transformation: { width: 300, height: 80 },
              type: "png"
            })
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 }
        })
      );
    }

    documentChildren.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `Fecha: ${new Date().toLocaleDateString('es-ES')}`,
            italics: true,
            size: 22
          })
        ]
      })
    );

    // Crear documento
    const doc = new Document({
      sections: [{
        properties: {},
        children: documentChildren
      }]
    });

    const blob = await Packer.toBlob(doc);
    
    const docxFileName = fileName || `Inspección_${folderName ? folderName + '_' : ''}${new Date().toISOString().split('T')[0]}.docx`;
    
    // Intentar guardar usando File System Access API
    const projectFolder = folderName || ConfigManager.getRuta();
    
    if (ConfigManager.isUsingFileSystemAPI()) {
      const saved = await FileSystemStorage.saveDocument(blob, docxFileName, projectFolder);
      
      if (saved) {
        console.log(`Documento guardado en docs generated/${projectFolder}/`);
        return blob;
      }
    }
    
    // Fallback: método tradicional
    saveAs(blob, docxFileName);
    return blob;

  } catch (error) {
    console.error('Error generando DOCX:', error);
    throw error;
  }
}
