import { generateId, type Novel } from '@/lib/novel-store';
import { savePdfDocument } from '@/lib/pdf-store';
import { uploadPdfToCloud, savePdfNovelMetadataToBackend } from '@/lib/pdf-cloud-store';
import { enqueue } from '@/lib/offline-queue';

export interface PdfImportProgress {
  stage: 'validating' | 'saving' | 'uploading' | 'done';
  current: number;
  total: number;
  message: string;
}

export interface PdfImportResult {
  novel: Novel;
  uploadedToCloud: boolean;
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
  userId: string | null,
  onProgress?: (progress: PdfImportProgress) => void,
): Promise<PdfImportResult> {
  onProgress?.({
    stage: 'validating',
    current: 1,
    total: 4,
    message: 'Validating PDF…',
  });

  await assertValidPdfFile(file);

  const novelId = generateId();
  const savedAt = new Date().toISOString();
  const novel: Novel = {
    id: novelId,
    title: normalizePdfTitle(file.name),
    url: `pdf://${novelId}`,
    chapters: [],
    savedAt,
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
    total: 4,
    message: 'Saving PDF locally…',
  });

  await savePdfDocument({
    novelId,
    fileName: file.name,
    mimeType: file.type || 'application/pdf',
    size: file.size,
    blob: file,
    createdAt: savedAt,
  });

  // Try cloud upload if logged in and online
  if (userId && navigator.onLine) {
    onProgress?.({
      stage: 'uploading',
      current: 3,
      total: 4,
      message: 'Uploading to cloud…',
    });

    try {
      const location = await uploadPdfToCloud(novelId, userId, file, (uploadProgress) => {
        onProgress?.({
          stage: 'uploading',
          current: 3,
          total: 4,
          message: `Uploading… ${uploadProgress.percent}%`,
        });
      });

      await savePdfNovelMetadataToBackend(novel, userId, location);

      novel.isLocalOnly = false;
      novel.storageBucket = location.bucket;
      novel.storagePath = location.path;

      onProgress?.({
        stage: 'done',
        current: 4,
        total: 4,
        message: 'Done.',
      });

      return { novel, uploadedToCloud: true };
    } catch {
      // Upload failed — keep local-only and enqueue for retry
      enqueue('uploadPdf', { novelId });
    }
  } else if (userId && !navigator.onLine) {
    // Logged in but offline — enqueue for retry when online
    enqueue('uploadPdf', { novelId });
  }

  onProgress?.({
    stage: 'done',
    current: 4,
    total: 4,
    message: 'Saved locally.',
  });

  return { novel, uploadedToCloud: false };
}
