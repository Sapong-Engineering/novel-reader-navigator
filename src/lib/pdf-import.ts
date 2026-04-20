import { generateId, type Novel } from '@/lib/novel-store';
import { savePdfDocument } from '@/lib/pdf-store';

export interface PdfImportProgress {
  stage: 'validating' | 'saving';
  current: number;
  total: number;
  message: string;
}

export interface PdfImportResult {
  novel: Novel;
}

const MAX_PDF_SIZE_BYTES = 50 * 1024 * 1024;

export function normalizePdfTitle(fileName: string): string {
  const withoutExtension = fileName.replace(/\.pdf$/i, '');
  return withoutExtension
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() || 'Untitled PDF';
}

async function assertValidPdfFile(file: File): Promise<void> {
  const fileNameLooksValid = /\.pdf$/i.test(file.name);
  const mimeLooksValid = file.type === '' || file.type === 'application/pdf';

  if (!fileNameLooksValid && !mimeLooksValid) {
    throw new Error('Please choose a valid PDF file.');
  }

  if (file.size <= 0) {
    throw new Error('This PDF is empty.');
  }

  if (file.size > MAX_PDF_SIZE_BYTES) {
    throw new Error('This PDF is too large for the first release. Please use a file under 50 MB.');
  }

  const header = await file.slice(0, 5).text();
  if (!header.startsWith('%PDF-')) {
    throw new Error('This file does not appear to be a readable PDF.');
  }
}

export async function importPdfFile(
  file: File,
  onProgress?: (progress: PdfImportProgress) => void,
): Promise<PdfImportResult> {
  onProgress?.({
    stage: 'validating',
    current: 1,
    total: 2,
    message: 'Validating PDF…',
  });

  await assertValidPdfFile(file);

  const novelId = generateId();
  const novel: Novel = {
    id: novelId,
    title: normalizePdfTitle(file.name),
    url: `pdf://${novelId}`,
    chapters: [],
    savedAt: new Date().toISOString(),
    sourceType: 'pdf',
    readerMode: 'pdf',
    sourceFileName: file.name,
    sourceFileSize: file.size,
    storageKey: novelId,
    isLocalOnly: true,
  };

  onProgress?.({
    stage: 'saving',
    current: 2,
    total: 2,
    message: 'Saving PDF locally…',
  });

  await savePdfDocument({
    novelId,
    fileName: file.name,
    mimeType: file.type || 'application/pdf',
    size: file.size,
    blob: file,
    createdAt: novel.savedAt,
  });

  return { novel };
}
