import { useState, useMemo, useCallback } from 'react';
import type { Chapter } from '@/lib/novel-store';

export interface UseChapterSearchResult {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  filteredChapters: Chapter[];
  resultCount: number;
  clearSearch: () => void;
  highlightMatch: (text: string) => string;
}

export function useChapterSearch(chapters: Chapter[]): UseChapterSearchResult {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredChapters = useMemo(() => {
    if (!searchQuery.trim()) return chapters;
    const q = searchQuery.trim().toLowerCase();
    // Numeric filter: if query is a number, filter by chapter number in title
    const num = parseInt(q, 10);
    if (!isNaN(num) && String(num) === q) {
      return chapters.filter(c => {
        const numMatch = c.title.match(/\d+/);
        return numMatch ? parseInt(numMatch[0], 10) === num : false;
      });
    }
    return chapters.filter(c => c.title.toLowerCase().includes(q));
  }, [chapters, searchQuery]);

  const clearSearch = useCallback(() => setSearchQuery(''), []);

  const highlightMatch = useCallback(
    (text: string): string => {
      if (!searchQuery.trim()) return text;
      const q = searchQuery.trim();
      const idx = text.toLowerCase().indexOf(q.toLowerCase());
      if (idx === -1) return text;
      return (
        text.slice(0, idx) +
        `<mark>${text.slice(idx, idx + q.length)}</mark>` +
        text.slice(idx + q.length)
      );
    },
    [searchQuery],
  );

  return {
    searchQuery,
    setSearchQuery,
    filteredChapters,
    resultCount: filteredChapters.length,
    clearSearch,
    highlightMatch,
  };
}
