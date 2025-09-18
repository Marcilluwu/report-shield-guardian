import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, ImageRun, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';

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
  vanStatus: {
    licensePlate: string;
    photos: PhotoWithComment[];
  };
  generalObservations: string;
}

export async function generateDocx(data: InspectionData, signatureName: string): Promise<void> {
  try {
    // Convertir imágenes a buffer
    const imageBuffers: { [key: string]: Uint8Array } = {};
    const allPhotos = [
      ...data.workEnvironment.photos,
      ...data.toolsStatus.photos,
      ...data.vanStatus.photos
    ];

    for (const photo of allPhotos) {
      const response = await fetch(photo.url);
      const buffer = await response.arrayBuffer();
      imageBuffers[photo.id] = new Uint8Array(buffer);
    }

    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          // Título principal
          new Paragraph({
            text: "ACTA DE INSPECCIÓN DE SEGURIDAD",
            heading: HeadingLevel.HEADING_1,
            alignment: "center",
            spacing: { after: 400 }
          }),

          // Fecha
          new Paragraph({
            children: [
              new TextRun({
                text: `FECHA INSPECCIÓN: ${new Date().toLocaleDateString('es-ES')}`,
                bold: true
              })
            ],
            alignment: "center",
            spacing: { after: 400 }
          }),

          // Información del proyecto
          new Paragraph({
            children: [
              new TextRun({ text: "PROMOTOR: ", bold: true }),
              new TextRun({ text: data.work.promotingCompany })
            ],
            spacing: { after: 200 }
          }),

          new Paragraph({
            children: [
              new TextRun({ text: "PROYECTO: ", bold: true }),
              new TextRun({ text: data.work.name })
            ],
            spacing: { after: 200 }
          }),

          new Paragraph({
            children: [
              new TextRun({ text: "EMPLAZAMIENTO: ", bold: true }),
              new TextRun({ text: data.work.location })
            ],
            spacing: { after: 200 }
          }),

          new Paragraph({
            children: [
              new TextRun({ text: "INSPECTOR: ", bold: true }),
              new TextRun({ text: data.inspector.name })
            ],
            spacing: { after: 200 }
          }),

          new Paragraph({
            children: [
              new TextRun({ text: "EMAIL: ", bold: true }),
              new TextRun({ text: data.inspector.email })
            ],
            spacing: { after: 400 }
          }),

          // Participantes
          new Paragraph({
            text: "PARTICIPANTES",
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 200 }
          }),

          new Paragraph({
            children: [
              new TextRun({ text: "INSPECTOR DE SEGURIDAD: ", bold: true }),
              new TextRun({ text: data.inspector.name })
            ],
            spacing: { after: 200 }
          }),

          // Workers
          ...data.workers.map(worker => 
            new Paragraph({
              children: [
                new TextRun({ text: `${worker.category.toUpperCase()}: `, bold: true }),
                new TextRun({ text: `${worker.name}, ${worker.company}` }),
                new TextRun({ text: ` (DNI: ${worker.dni})`, italics: true })
              ],
              spacing: { after: 200 }
            })
          ),

          // Resumen de inspección
          new Paragraph({
            text: "RESUMEN DE LA INSPECCIÓN",
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 200 }
          }),

          new Paragraph({
            text: "Se levanta acta de la inspección de seguridad realizada en la fecha indicada.",
            spacing: { after: 300 }
          }),

          // Tabla de EPIs
          new Table({
            rows: [
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: "Código", alignment: "center" })] }),
                  new TableCell({ children: [new Paragraph({ text: "EPI/Elemento", alignment: "center" })] }),
                  new TableCell({ children: [new Paragraph({ text: "Estado", alignment: "center" })] }),
                  new TableCell({ children: [new Paragraph({ text: "Responsable", alignment: "center" })] })
                ]
              }),
              ...data.episReviewed.map((epi, index) => 
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph({ text: String(index + 1).padStart(2, '0') })] }),
                    new TableCell({ children: [new Paragraph({ text: epi.name })] }),
                    new TableCell({ children: [new Paragraph({ text: epi.checked ? 'Correcto' : 'Deficiente' })] }),
                    new TableCell({ children: [new Paragraph({ text: 'Inspector' })] })
                  ]
                })
              )
            ]
          }),

          // Desarrollo de la inspección
          new Paragraph({
            text: "DESARROLLO DE LA INSPECCIÓN",
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 300 }
          }),

          // Fotos con comentarios
          ...allPhotos.map((photo, index) => [
            new Paragraph({
              children: [
                new TextRun({ 
                  text: `${String(index + 1).padStart(2, '0')}.${String(index + 1).padStart(2, '0')}`, 
                  bold: true 
                })
              ],
              spacing: { before: 300, after: 200 }
            }),

            new Paragraph({
              text: photo.comment || 'Sin comentario',
              spacing: { after: 200 }
            }),

            new Paragraph({
              children: [
                new ImageRun({
                  data: imageBuffers[photo.id],
                  transformation: {
                    width: 400,
                    height: 300
                  },
                  type: "png"
                })
              ],
              alignment: "center",
              spacing: { after: 300 }
            })
          ]).flat(),

          // Asuntos pendientes
          ...(data.generalObservations ? [
            new Paragraph({
              text: "ASUNTOS PENDIENTES",
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 400, after: 200 }
            }),

            new Table({
              rows: [
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph({ text: "Código", alignment: "center" })] }),
                    new TableCell({ children: [new Paragraph({ text: "Asunto", alignment: "center" })] }),
                    new TableCell({ children: [new Paragraph({ text: "Estado", alignment: "center" })] }),
                    new TableCell({ children: [new Paragraph({ text: "Responsable", alignment: "center" })] })
                  ]
                }),
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph({ text: "01" })] }),
                    new TableCell({ children: [new Paragraph({ text: data.generalObservations })] }),
                    new TableCell({ children: [new Paragraph({ text: "Pendiente" })] }),
                    new TableCell({ children: [new Paragraph({ text: "Inspector" })] })
                  ]
                })
              ]
            })
          ] : []),

          // Firma
          new Paragraph({
            text: "FIRMA DE LOS PARTICIPANTES",
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 300 }
          }),

          new Paragraph({
            children: [
              new TextRun({ text: "Firma de: ", bold: true }),
              new TextRun({ text: signatureName })
            ],
            spacing: { after: 200 }
          }),

          new Paragraph({
            text: "_".repeat(50),
            spacing: { after: 200 }
          }),

          new Paragraph({
            children: [
              new TextRun({ 
                text: `Fecha: ${new Date().toLocaleDateString('es-ES')}`, 
                italics: true 
              })
            ]
          })
        ]
      }]
    });

    const buffer = await Packer.toBuffer(doc);
    const blob = new Blob([new Uint8Array(buffer)], { 
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
    });
    
    const fileName = `reporte-inspeccion-${new Date().toISOString().split('T')[0]}-${Date.now()}.docx`;
    saveAs(blob, fileName);

  } catch (error) {
    console.error('Error generando DOCX:', error);
    throw error;
  }
}