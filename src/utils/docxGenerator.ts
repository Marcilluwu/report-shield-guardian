import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, ImageRun, HeadingLevel } from 'docx';
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
  folderName?: string
): Promise<void> {
  try {
    // Convertir imágenes a buffer usando ArrayBuffer directamente
    const imageBuffers: { [key: string]: ArrayBuffer } = {};
    const allPhotos = [
      ...data.workEnvironment.photos,
      ...data.toolsStatus.photos,
      ...data.vans.flatMap(van => van.photos)
    ];

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

    for (const photo of allPhotos) {
      const response = await fetch(photo.url);
      const buffer = await response.arrayBuffer();
      imageBuffers[photo.id] = buffer;
    }

    // Crear elementos del documento
    const documentChildren = [];

    // Logo si está disponible
    if (logoBuffer) {
      documentChildren.push(
        new Paragraph({
          children: [
            new ImageRun({
              data: logoBuffer,
              transformation: {
                width: 100,
                height: 100
              },
              type: "jpg"
            })
          ],
          alignment: "center",
          spacing: { after: 300 }
        })
      );
    }

    // Título principal
    documentChildren.push(
      new Paragraph({
        text: "ACTA DE INSPECCIÓN DE SEGURIDAD",
        heading: HeadingLevel.HEADING_1,
        alignment: "center",
        spacing: { after: 400 }
      })
    );

    // Fecha
    documentChildren.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `FECHA INSPECCIÓN: ${new Date().toLocaleDateString('es-ES')}`,
            bold: true
          })
        ],
        alignment: "center",
        spacing: { after: 400 }
      })
    );

    // Información del proyecto
    documentChildren.push(
      new Paragraph({
        children: [
          new TextRun({ text: "PROMOTOR: ", bold: true }),
          new TextRun({ text: data.work.promotingCompany })
        ],
        spacing: { after: 200 }
      })
    );

    documentChildren.push(
      new Paragraph({
        children: [
          new TextRun({ text: "PROYECTO: ", bold: true }),
          new TextRun({ text: data.work.name })
        ],
        spacing: { after: 200 }
      })
    );

    documentChildren.push(
      new Paragraph({
        children: [
          new TextRun({ text: "EMPLAZAMIENTO: ", bold: true }),
          new TextRun({ text: data.work.location })
        ],
        spacing: { after: 200 }
      })
    );

    documentChildren.push(
      new Paragraph({
        children: [
          new TextRun({ text: "INSPECTOR: ", bold: true }),
          new TextRun({ text: data.inspector.name })
        ],
        spacing: { after: 200 }
      })
    );

    documentChildren.push(
      new Paragraph({
        children: [
          new TextRun({ text: "EMAIL: ", bold: true }),
          new TextRun({ text: data.inspector.email })
        ],
        spacing: { after: 400 }
      })
    );

    // Participantes
    documentChildren.push(
      new Paragraph({
        text: "PARTICIPANTES",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 400, after: 200 }
      })
    );

    documentChildren.push(
      new Paragraph({
        children: [
          new TextRun({ text: "INSPECTOR DE SEGURIDAD: ", bold: true }),
          new TextRun({ text: data.inspector.name })
        ],
        spacing: { after: 200 }
      })
    );

    // Workers
    data.workers.forEach(worker => {
      documentChildren.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${worker.category.toUpperCase()}: `, bold: true }),
            new TextRun({ text: `${worker.name}, ${worker.company}` }),
            new TextRun({ text: ` (DNI: ${worker.dni})`, italics: true })
          ],
          spacing: { after: 200 }
        })
      );
    });

    // Resumen de inspección
    documentChildren.push(
      new Paragraph({
        text: "RESUMEN DE LA INSPECCIÓN",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 400, after: 200 }
      })
    );

    documentChildren.push(
      new Paragraph({
        text: "Se levanta acta de la inspección de seguridad realizada en la fecha indicada.",
        spacing: { after: 300 }
      })
    );

    // Tabla de EPIs con anchos de columna
    const epiTableRows = [
      new TableRow({
        children: [
          new TableCell({ 
            children: [new Paragraph({ text: "Código", alignment: "center" })],
            width: { size: 1500, type: "dxa" }
          }),
          new TableCell({ 
            children: [new Paragraph({ text: "EPI/Elemento", alignment: "center" })],
            width: { size: 4500, type: "dxa" }
          }),
          new TableCell({ 
            children: [new Paragraph({ text: "Estado", alignment: "center" })],
            width: { size: 2000, type: "dxa" }
          }),
          new TableCell({ 
            children: [new Paragraph({ text: "Responsable", alignment: "center" })],
            width: { size: 2000, type: "dxa" }
          })
        ]
      })
    ];

    data.episReviewed.forEach((epi, index) => {
      epiTableRows.push(
        new TableRow({
          children: [
            new TableCell({ 
              children: [new Paragraph({ text: String(index + 1).padStart(2, '0') })],
              width: { size: 1500, type: "dxa" }
            }),
            new TableCell({ 
              children: [new Paragraph({ text: epi.name })],
              width: { size: 4500, type: "dxa" }
            }),
            new TableCell({ 
              children: [new Paragraph({ text: epi.checked ? 'Correcto' : 'Deficiente' })],
              width: { size: 2000, type: "dxa" }
            }),
            new TableCell({ 
              children: [new Paragraph({ text: 'Inspector' })],
              width: { size: 2000, type: "dxa" }
            })
          ]
        })
      );
    });

    documentChildren.push(
      new Table({
        rows: epiTableRows,
        width: { size: 100, type: "pct" }
      })
    );

    // Desarrollo de la inspección
    documentChildren.push(
      new Paragraph({
        text: "DESARROLLO DE LA INSPECCIÓN",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 400, after: 300 }
      })
    );

    // Fotos con comentarios
    allPhotos.forEach((photo, index) => {
      documentChildren.push(
        new Paragraph({
          children: [
            new TextRun({ 
              text: `${String(index + 1).padStart(2, '0')}.${String(index + 1).padStart(2, '0')}`, 
              bold: true 
            })
          ],
          spacing: { before: 300, after: 200 }
        })
      );

      documentChildren.push(
        new Paragraph({
          text: photo.comment || 'Sin comentario',
          spacing: { after: 200 }
        })
      );

      documentChildren.push(
        new Paragraph({
          children: [
            new ImageRun({
              data: imageBuffers[photo.id],
              transformation: {
                width: 400,
                height: 300
              },
              type: "jpg"
            })
          ],
          alignment: "center",
          spacing: { after: 300 }
        })
      );
    });

    // Firma
    documentChildren.push(
      new Paragraph({
        text: "FIRMA DE LOS PARTICIPANTES",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 400, after: 300 }
      })
    );

    documentChildren.push(
      new Paragraph({
        children: [
          new TextRun({ text: "Firma de: ", bold: true }),
          new TextRun({ text: signatureName })
        ],
        spacing: { after: 200 }
      })
    );

    documentChildren.push(
      new Paragraph({
        text: "_".repeat(50),
        spacing: { after: 200 }
      })
    );

    documentChildren.push(
      new Paragraph({
        children: [
          new TextRun({ 
            text: `Fecha: ${new Date().toLocaleDateString('es-ES')}`, 
            italics: true 
          })
        ]
      })
    );

    const doc = new Document({
      sections: [{
        properties: {},
        children: documentChildren
      }]
    });

    const blob = await Packer.toBlob(doc);
    
    const folderPrefix = folderName ? `${folderName}_` : '';
    const fileName = `Inspección_${folderPrefix}${new Date().toISOString().split('T')[0]}.docx`;
    
    // Intentar guardar usando File System Access API
    const projectFolder = folderName || ConfigManager.getRuta();
    
    if (ConfigManager.isUsingFileSystemAPI()) {
      const saved = await FileSystemStorage.saveDocument(blob, fileName, projectFolder);
      
      if (saved) {
        console.log(`Documento guardado en docs generated/${projectFolder}/`);
        return;
      }
    }
    
    // Fallback: método tradicional
    saveAs(blob, fileName);

  } catch (error) {
    console.error('Error generando DOCX:', error);
    throw error;
  }
}