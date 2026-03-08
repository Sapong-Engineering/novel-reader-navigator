// Local storage based novel store
import { toast } from 'sonner';

export interface Chapter {
  id: string;
  title: string;
  url: string;
  content?: string;
  savedAt?: string;
}

export interface Novel {
  id: string;
  title: string;
  url: string;
  coverUrl?: string;
  description?: string;
  chapters: Chapter[];
  savedAt: string;
}

const STORAGE_KEY = 'novel-reader-library';

function safePersist(key: string, data: string): boolean {
  try {
    localStorage.setItem(key, data);
    return true;
  } catch (e) {
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      toast.error('Storage is full. Consider removing some novels to free up space.');
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
