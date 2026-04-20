import { useCallback, useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist/types/src/display/api';
import { getPdfPageText, savePdfPageText } from '@/lib/pdf-store';
import { extractPdfPageText, type PdfAudioSegment, type StoredPdfPageText } from '@/lib/pdf-text';

interface UsePdfTextResult {
  getSegmentsForPage: (pageNumber: number) => PdfAudioSegment[];
  isPageLoading: (pageNumber: number) => boolean;
  getPageText: (pageNumber: number) => StoredPdfPageText | null;
  ensurePageText: (pageNumber: number) => void;
}

export function usePdfText(
  novelId: string,
  pdf: PDFDocumentProxy | null,
  currentPage: number,
  preloadRadius = 1,
): UsePdfTextResult {
  const [pages, setPages] = useState<Map<number, StoredPdfPageText>>(() => new Map());
  const [loadingPages, setLoadingPages] = useState<Set<number>>(() => new Set());
  const inflightPagesRef = useRef<Set<number>>(new Set());

  const markLoading = useCallback((pageNumber: number, isLoading: boolean) => {
    setLoadingPages((previous) => {
      const next = new Set(previous);
      if (isLoading) {
        next.add(pageNumber);
      } else {
        next.delete(pageNumber);
      }
      return next;
    });
  }, []);

  const ensurePageText = useCallback((pageNumber: number) => {
    if (!pdf || pageNumber < 1 || pageNumber > pdf.numPages) return;
    if (pages.has(pageNumber) || inflightPagesRef.current.has(pageNumber)) return;

    inflightPagesRef.current.add(pageNumber);
    markLoading(pageNumber, true);

    void getPdfPageText(novelId, pageNumber)
      .then(async (cached) => {
        if (cached) return cached;
        const page = await pdf.getPage(pageNumber);
        try {
          const extracted = await extractPdfPageText(page, novelId, pageNumber);
          await savePdfPageText(extracted);
          return extracted;
        } finally {
          page.cleanup();
        }
      })
      .then((pageText) => {
        setPages((previous) => {
          const next = new Map(previous);
          next.set(pageNumber, pageText);
          return next;
        });
      })
      .catch((err) => {
        console.warn('Failed to extract PDF page text:', err);
      })
      .finally(() => {
        inflightPagesRef.current.delete(pageNumber);
        markLoading(pageNumber, false);
      });
  }, [markLoading, novelId, pages, pdf]);

  useEffect(() => {
    if (!pdf) return;

    for (let pageNumber = currentPage - preloadRadius; pageNumber <= currentPage + preloadRadius; pageNumber += 1) {
      ensurePageText(pageNumber);
    }
  }, [currentPage, ensurePageText, pdf, preloadRadius]);

  const getSegmentsForPage = useCallback((pageNumber: number) => {
    return pages.get(pageNumber)?.segments ?? [];
  }, [pages]);

  const isPageLoading = useCallback((pageNumber: number) => {
    return loadingPages.has(pageNumber);
  }, [loadingPages]);

  const getPageText = useCallback((pageNumber: number) => {
    return pages.get(pageNumber) ?? null;
  }, [pages]);

  return {
    getSegmentsForPage,
    isPageLoading,
    getPageText,
    ensurePageText,
  };
}
