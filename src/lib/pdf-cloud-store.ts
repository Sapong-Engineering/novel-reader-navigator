import { supabase } from '@/integrations/supabase/client';
import { savePdfDocument } from '@/lib/pdf-store';
import type { Novel } from '@/lib/novel-store';

const BUCKET = 'user-pdfs';
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

export interface PdfCloudLocation {
  bucket: string;
  /** Format: "{userId}/{novelId}.pdf" */
  path: string;
}

export interface PdfUploadProgress {
  stage: 'uploading';
  bytesUploaded: number;
  totalBytes: number;
  percent: number;
}

/**
 * Uploads a PDF file to Supabase Storage with XHR so progress events fire.
 * Returns the bucket/path on success.
 */
export async function uploadPdfToCloud(
  novelId: string,
  userId: string,
  file: File,
  onProgress?: (progress: PdfUploadProgress) => void,
): Promise<PdfCloudLocation> {
  const path = `${userId}/${novelId}.pdf`;

  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error('Not authenticated');

  const storageUrl = `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`;

  return new Promise<PdfCloudLocation>((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress({
          stage: 'uploading',
          bytesUploaded: e.loaded,
          totalBytes: e.total,
          percent: Math.round((e.loaded / e.total) * 100),
        });
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({ bucket: BUCKET, path });
      } else {
        reject(new Error(`Upload failed: ${xhr.status} ${xhr.responseText}`));
      }
    };

    xhr.onerror = () => reject(new Error('Upload network error'));
    xhr.ontimeout = () => reject(new Error('Upload timed out'));

    xhr.open('POST', storageUrl);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.setRequestHeader('Content-Type', 'application/pdf');
    xhr.setRequestHeader('x-upsert', 'true');
    xhr.send(file);
  });
}

/**
 * Returns a 1-hour signed download URL for a private PDF.
 * Generate fresh each time; do not persist the URL itself.
 */
export async function getSignedPdfDownloadUrl(
  bucket: string,
  path: string,
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 3600);
  if (error) throw error;
  return data.signedUrl;
}

/**
 * Removes a PDF from Supabase Storage.
 * Not-found errors are silently swallowed.
 */
export async function deletePdfFromCloud(
  bucket: string,
  path: string,
): Promise<void> {
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error && !error.message.includes('not found') && !error.message.includes('Not Found')) {
    throw error;
  }
}

/**
 * Fetches a PDF blob from a signed URL, caches it in IndexedDB, and returns it.
 */
export async function fetchPdfBlobFromCloud(
  signedUrl: string,
  novelId: string,
  fileName: string,
  mimeType: string,
  size: number,
  createdAt: string,
): Promise<Blob> {
  const response = await fetch(signedUrl);
  if (!response.ok) {
    throw new Error(`PDF download failed: ${response.status} ${response.statusText}`);
  }
  const blob = await response.blob();
  await savePdfDocument({ novelId, fileName, mimeType, size, blob, createdAt });
  return blob;
}

/**
 * Upserts the novels row with all PDF-specific columns.
 * Call this after a successful Storage upload.
 */
export async function savePdfNovelMetadataToBackend(
  novel: Novel,
  userId: string,
  location: PdfCloudLocation,
): Promise<void> {
  const { error } = await supabase.from('novels').upsert(
    {
      user_id: userId,
      local_id: novel.id,
      title: novel.title,
      url: novel.url,
      cover_url: novel.coverUrl ?? null,
      description: novel.description ?? null,
      saved_at: novel.savedAt,
      updated_at: new Date().toISOString(),
      source_type: 'pdf',
      reader_mode: 'pdf',
      storage_bucket: location.bucket,
      storage_path: location.path,
      source_file_name: novel.sourceFileName ?? null,
      source_file_size: novel.sourceFileSize ?? null,
      page_count: novel.pageCount ?? null,
    },
    { onConflict: 'user_id,local_id' },
  );
  if (error) throw error;
}
