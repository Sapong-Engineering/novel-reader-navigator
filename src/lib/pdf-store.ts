import type { StoredPdfPageText } from '@/lib/pdf-text';

export interface StoredPdfDocument {
  novelId: string;
  fileName: string;
  mimeType: string;
  size: number;
  blob: Blob;
  createdAt: string;
}

const DB_NAME = 'novel-reader-pdf-store';
const DB_VERSION = 2;
const PDF_DOCUMENTS_STORE = 'pdf_documents';
const PDF_PAGE_TEXT_STORE = 'pdf_page_text';
const PDF_PAGE_TEXT_NOVEL_INDEX = 'novelId';

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
      if (!database.objectStoreNames.contains(PDF_PAGE_TEXT_STORE)) {
        const pageTextStore = database.createObjectStore(PDF_PAGE_TEXT_STORE, { keyPath: 'id' });
        pageTextStore.createIndex(PDF_PAGE_TEXT_NOVEL_INDEX, 'novelId', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Failed to open PDF store'));
  });

  return dbPromise;
}

function withStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore, resolve: (value: T) => void, reject: (error: Error) => void) => void,
): Promise<T> {
  return openPdfStore().then((database) => new Promise<T>((resolve, reject) => {
    const transaction = database.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);

    transaction.onerror = () => reject(transaction.error ?? new Error('PDF store transaction failed'));
    action(store, resolve, reject);
  }));
}

export async function savePdfDocument(document: StoredPdfDocument): Promise<void> {
  await withStore<void>(PDF_DOCUMENTS_STORE, 'readwrite', (store, resolve, reject) => {
    const request = store.put(document);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error('Failed to save PDF document'));
  });
}

export async function getPdfDocument(novelId: string): Promise<StoredPdfDocument | null> {
  return withStore<StoredPdfDocument | null>(PDF_DOCUMENTS_STORE, 'readonly', (store, resolve, reject) => {
    const request = store.get(novelId);
    request.onsuccess = () => resolve((request.result as StoredPdfDocument | undefined) ?? null);
    request.onerror = () => reject(request.error ?? new Error('Failed to load PDF document'));
  });
}

export async function hasPdfDocument(novelId: string): Promise<boolean> {
  return withStore<boolean>(PDF_DOCUMENTS_STORE, 'readonly', (store, resolve, reject) => {
    const request = store.count(novelId);
    request.onsuccess = () => resolve(request.result > 0);
    request.onerror = () => reject(request.error ?? new Error('Failed to check PDF document'));
  });
}

export async function deletePdfNovelData(novelId: string): Promise<void> {
  await openPdfStore().then((database) => new Promise<void>((resolve, reject) => {
    const transaction = database.transaction([PDF_DOCUMENTS_STORE, PDF_PAGE_TEXT_STORE], 'readwrite');
    const documentsStore = transaction.objectStore(PDF_DOCUMENTS_STORE);
    const pageTextStore = transaction.objectStore(PDF_PAGE_TEXT_STORE);
    const pageTextIndex = pageTextStore.index(PDF_PAGE_TEXT_NOVEL_INDEX);

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('Failed to delete PDF data'));

    documentsStore.delete(novelId);

    const cursorRequest = pageTextIndex.openCursor(IDBKeyRange.only(novelId));
    cursorRequest.onsuccess = () => {
      const cursor = cursorRequest.result;
      if (!cursor) return;
      cursor.delete();
      cursor.continue();
    };
    cursorRequest.onerror = () => reject(cursorRequest.error ?? new Error('Failed to delete PDF text data'));
  }));
}

export async function listStoredPdfNovelIds(): Promise<string[]> {
  return withStore<string[]>(PDF_DOCUMENTS_STORE, 'readonly', (store, resolve, reject) => {
    const request = store.getAllKeys();
    request.onsuccess = () => resolve(request.result.map((key) => String(key)));
    request.onerror = () => reject(request.error ?? new Error('Failed to list PDF documents'));
  });
}

export async function savePdfPageText(pageText: StoredPdfPageText): Promise<void> {
  await withStore<void>(PDF_PAGE_TEXT_STORE, 'readwrite', (store, resolve, reject) => {
    const request = store.put(pageText);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error('Failed to save PDF page text'));
  });
}

export async function getPdfPageText(
  novelId: string,
  pageNumber: number,
  source: StoredPdfPageText['source'] = 'native',
): Promise<StoredPdfPageText | null> {
  return withStore<StoredPdfPageText | null>(PDF_PAGE_TEXT_STORE, 'readonly', (store, resolve, reject) => {
    const request = store.get(getPdfPageTextId(novelId, pageNumber, source));
    request.onsuccess = () => resolve((request.result as StoredPdfPageText | undefined) ?? null);
    request.onerror = () => reject(request.error ?? new Error('Failed to load PDF page text'));
  });
}

export function getPdfPageTextId(
  novelId: string,
  pageNumber: number,
  source: StoredPdfPageText['source'],
): string {
  return `${novelId}:${pageNumber}:${source}`;
}
