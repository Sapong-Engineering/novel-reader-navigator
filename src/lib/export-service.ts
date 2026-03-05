import { jsPDF } from 'jspdf';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';
import type { Chapter } from './novel-store';

export interface ExportProgress {
  current: number;
  total: number;
  currentTitle: string;
  percent: number;
  done: boolean;
  cancelled: boolean;
}

export type ExportProgressCallback = (progress: ExportProgress) => void;

export async function exportToPdfWithProgress(
  title: string,
  chapters: Chapter[],
  onProgress?: ExportProgressCallback,
  signal?: AbortSignal,
): Promise<void> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const maxWidth = pageWidth - margin * 2;
  let y = 30;
  const total = chapters.filter(c => c.content).length;
  let current = 0;

  // Title
  doc.setFontSize(22);
  doc.text(title, pageWidth / 2, y, { align: 'center' });
  y += 20;

  for (const chapter of chapters) {
    if (!chapter.content) continue;
    if (signal?.aborted) {
      onProgress?.({ current, total, currentTitle: chapter.title, percent: (current / total) * 100, done: false, cancelled: true });
      return;
    }

    if (y > 260) { doc.addPage(); y = 20; }
    doc.setFontSize(16);
    doc.text(chapter.title, margin, y);
    y += 10;

    doc.setFontSize(11);
    const lines = doc.splitTextToSize(chapter.content, maxWidth);
    for (const line of lines) {
      if (y > 280) { doc.addPage(); y = 20; }
      doc.text(line, margin, y);
      y += 6;
    }
    y += 10;

    current += 1;
    onProgress?.({
      current,
      total,
      currentTitle: chapter.title,
      percent: Math.round((current / total) * 100),
      done: current === total,
      cancelled: false,
    });

    // Yield to UI thread
    await new Promise(res => setTimeout(res, 0));
  }

  doc.save(`${title}.pdf`);
}

export async function exportToDocxWithProgress(
  title: string,
  chapters: Chapter[],
  onProgress?: ExportProgressCallback,
  signal?: AbortSignal,
): Promise<void> {
  const children: Paragraph[] = [
    new Paragraph({ text: title, heading: HeadingLevel.TITLE, spacing: { after: 400 } }),
  ];

  const total = chapters.filter(c => c.content).length;
  let current = 0;

  for (const chapter of chapters) {
    if (!chapter.content) continue;
    if (signal?.aborted) {
      onProgress?.({ current, total, currentTitle: chapter.title, percent: (current / total) * 100, done: false, cancelled: true });
      return;
    }

    children.push(
      new Paragraph({ text: chapter.title, heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } }),
    );

    for (const para of chapter.content.split('\n\n')) {
      if (para.trim()) {
        children.push(
          new Paragraph({ children: [new TextRun({ text: para.trim(), size: 24 })], spacing: { after: 200 } }),
        );
      }
    }

    current += 1;
    onProgress?.({
      current,
      total,
      currentTitle: chapter.title,
      percent: Math.round((current / total) * 100),
      done: current === total,
      cancelled: false,
    });

    await new Promise(res => setTimeout(res, 0));
  }

  const blob = await Packer.toBlob(new Document({ sections: [{ children }] }));
  saveAs(blob, `${title}.docx`);
}
