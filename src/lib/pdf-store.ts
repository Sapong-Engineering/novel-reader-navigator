export interface StoredPdfDocument {
  novelId: string;
  fileName: string;
  mimeType: string;
  size: number;
  blob: Blob;
  createdAt: string;
}

const DB_NAME = 'novel-reader-pdf-store';
const DB_VERSION = 1;
const PDF_DOCUMENTS_STORE = 'pdf_documents';

let dbPromise: Promise<IDBDatabase> | null = null;

function openPdfStore(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(PDF_DOCUMENTS_STORE)) {
        database.createObjectStore(PDF_DOCUMENTS_STORE, { keyPath: 'novelId' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Failed to open PDF store'));
  });

  return dbPromise;
}

function withStore<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore, resolve: (value: T) => void, reject: (error: Error) => void) => void,
): Promise<T> {
  return openPdfStore().then((database) => new Promise<T>((resolve, reject) => {
    const transaction = database.transaction(PDF_DOCUMENTS_STORE, mode);
    const store = transaction.objectStore(PDF_DOCUMENTS_STORE);

    transaction.onerror = () => reject(transaction.error ?? new Error('PDF store transaction failed'));
    action(store, resolve, reject);
  }));
}

export async function savePdfDocument(document: StoredPdfDocument): Promise<void> {
  await withStore<void>('readwrite', (store, resolve, reject) => {
    const request = store.put(document);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error('Failed to save PDF document'));
  });
}

export async function getPdfDocument(novelId: string): Promise<StoredPdfDocument | null> {
  return withStore<StoredPdfDocument | null>('readonly', (store, resolve, reject) => {
    const request = store.get(novelId);
    request.onsuccess = () => resolve((request.result as StoredPdfDocument | undefined) ?? null);
    request.onerror = () => reject(request.error ?? new Error('Failed to load PDF document'));
  });
}

export async function hasPdfDocument(novelId: string): Promise<boolean> {
  return withStore<boolean>('readonly', (store, resolve, reject) => {
    const request = store.count(novelId);
    request.onsuccess = () => resolve(request.result > 0);
    request.onerror = () => reject(request.error ?? new Error('Failed to check PDF document'));
  });
}

export async function deletePdfNovelData(novelId: string): Promise<void> {
  await withStore<void>('readwrite', (store, resolve, reject) => {
    const request = store.delete(novelId);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error('Failed to delete PDF document'));
  });
}

export async function listStoredPdfNovelIds(): Promise<string[]> {
  return withStore<string[]>('readonly', (store, resolve, reject) => {
    const request = store.getAllKeys();
    request.onsuccess = () => resolve(request.result.map((key) => String(key)));
    request.onerror = () => reject(request.error ?? new Error('Failed to list PDF documents'));
  });
}
