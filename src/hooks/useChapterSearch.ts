import { useState, useMemo, useCallback } from 'react';
import type { Chapter } from '@/lib/novel-store';

export interface HighlightSegment {
  text: string;
  highlighted: boolean;
}

export interface UseChapterSearchResult {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  filteredChapters: Chapter[];
  resultCount: number;
  clearSearch: () => void;
  getHighlightSegments: (text: string) => HighlightSegment[];
}

export function useChapterSearch(chapters: Chapter[]): UseChapterSearchResult {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredChapters = useMemo(() => {
    if (!searchQuery.trim()) return chapters;
    const q = searchQuery.trim().toLowerCase();
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

  const getHighlightSegments = useCallback(
    (text: string): HighlightSegment[] => {
      if (!searchQuery.trim()) return [{ text, highlighted: false }];
      const q = searchQuery.trim();
      const idx = text.toLowerCase().indexOf(q.toLowerCase());
      if (idx === -1) return [{ text, highlighted: false }];
      return [
        { text: text.slice(0, idx), highlighted: false },
        { text: text.slice(idx, idx + q.length), highlighted: true },
        { text: text.slice(idx + q.length), highlighted: false },
      ].filter(s => s.text.length > 0);
    },
    [searchQuery],
  );

  return {
    searchQuery,
    setSearchQuery,
    filteredChapters,
    resultCount: filteredChapters.length,
    clearSearch,
    getHighlightSegments,
  };
}
