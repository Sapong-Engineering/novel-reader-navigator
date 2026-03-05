// Local storage based novel store

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
  localStorage.setItem(STORAGE_KEY, JSON.stringify(library));
}

export function getNovel(id: string): Novel | undefined {
  return getLibrary().find(n => n.id === id);
}

export function deleteNovel(id: string): void {
  const library = getLibrary().filter(n => n.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(library));
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}
