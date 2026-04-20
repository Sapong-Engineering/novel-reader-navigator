export interface PdfReadingProgress {
  pageNumber: number;
  scrollTop: number;
  updatedAt: string | null;
}

function getProgressKey(novelId: string): string {
  return `pdf-progress:${novelId}`;
}

export function getPdfReadingProgress(novelId: string): PdfReadingProgress {
  const stored = localStorage.getItem(getProgressKey(novelId));
  if (!stored) {
    return { pageNumber: 1, scrollTop: 0, updatedAt: null };
  }

  try {
    const parsed = JSON.parse(stored);
    if (parsed && typeof parsed === 'object') {
      return {
        pageNumber: typeof parsed.pageNumber === 'number' && parsed.pageNumber > 0 ? parsed.pageNumber : 1,
        scrollTop: typeof parsed.scrollTop === 'number' && parsed.scrollTop >= 0 ? parsed.scrollTop : 0,
        updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : null,
      };
    }
  } catch {
    // Fall through to default below.
  }

  return { pageNumber: 1, scrollTop: 0, updatedAt: null };
}

export function savePdfReadingProgress(
  novelId: string,
  pageNumber: number,
  scrollTop: number,
): void {
  localStorage.setItem(getProgressKey(novelId), JSON.stringify({
    pageNumber,
    scrollTop,
    updatedAt: new Date().toISOString(),
  }));
}
