// Local storage based novel store
import { toast } from 'sonner';

export type NovelSourceType = 'web' | 'pdf';

export interface Chapter {
  id: string;
  title: string;
  url: string;
  content?: string;
  savedAt?: string;
  pageStart?: number;
  pageEnd?: number;
  sourceType?: NovelSourceType;
}

export interface Novel {
  id: string;
  title: string;
  url: string;
  coverUrl?: string;
  description?: string;
  chapters: Chapter[];
  savedAt: string;
  sourceType?: NovelSourceType;
  readerMode?: 'text' | 'pdf';
  sourceFileName?: string;
  sourceFileSize?: number;
  pageCount?: number;
  storageKey?: string;
  isLocalOnly?: boolean;
}

const STORAGE_KEY = 'novel-reader-library';

// Prevent repeated quota toast — show at most once per 30 seconds
let lastQuotaToastAt = 0;

function safePersist(key: string, data: string): boolean {
  try {
    localStorage.setItem(key, data);
    return true;
  } catch (e) {
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      const now = Date.now();
      if (now - lastQuotaToastAt > 30_000) {
        lastQuotaToastAt = now;
        toast.error('Storage is full. Remove some novels to free up space.', {
          action: { label: 'OK', onClick: () => {} },
          duration: 8000,
        });
      }
    } else {
      console.error('Failed to save to localStorage:', e);
    }
    return false;
  }
}

export function getLibrary(): Novel[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveNovel(novel: Novel): void {
  const library = getLibrary();
  const index = library.findIndex(n => n.id === novel.id);
  if (index >= 0) {
    library[index] = novel;
  } else {
    library.push(novel);
  }
  safePersist(STORAGE_KEY, JSON.stringify(library));
}

export function getNovel(id: string): Novel | undefined {
  return getLibrary().find(n => n.id === id);
}

export function deleteNovel(id: string): void {
  const library = getLibrary().filter(n => n.id !== id);
  safePersist(STORAGE_KEY, JSON.stringify(library));
}

export function generateId(): string {
  return crypto.randomUUID();
}

export function isPdfNovel(novel: Novel | null | undefined): novel is Novel {
  return novel?.sourceType === 'pdf';
}
