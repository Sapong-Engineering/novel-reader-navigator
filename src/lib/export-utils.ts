import { jsPDF } from 'jspdf';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';
import type { Chapter } from './novel-store';

export async function exportToPdf(title: string, chapters: Chapter[]): Promise<void> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const maxWidth = pageWidth - margin * 2;
  let y = 30;

  // Title
  doc.setFontSize(22);
  doc.text(title, pageWidth / 2, y, { align: 'center' });
  y += 20;

  for (const chapter of chapters) {
    if (!chapter.content) continue;

    // Chapter title
    if (y > 260) {
      doc.addPage();
      y = 20;
    }
    doc.setFontSize(16);
    doc.text(chapter.title, margin, y);
    y += 10;

    // Chapter content
    doc.setFontSize(11);
    const lines = doc.splitTextToSize(chapter.content, maxWidth);
    for (const line of lines) {
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, margin, y);
      y += 6;
    }
    y += 10;
  }

  doc.save(`${title}.pdf`);
}

export async function exportToDocx(title: string, chapters: Chapter[]): Promise<void> {
  const children: Paragraph[] = [
    new Paragraph({
      text: title,
      heading: HeadingLevel.TITLE,
      spacing: { after: 400 },
    }),
  ];

  for (const chapter of chapters) {
    if (!chapter.content) continue;

    children.push(
      new Paragraph({
        text: chapter.title,
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      })
    );

    const paragraphs = chapter.content.split('\n\n');
    for (const para of paragraphs) {
      if (para.trim()) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: para.trim(), size: 24 })],
            spacing: { after: 200 },
          })
        );
      }
    }
  }

  const doc = new Document({
    sections: [{ children }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${title}.docx`);
}
