import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { saveNovel, type Novel } from '@/lib/novel-store';
import { getPdfDocument } from '@/lib/pdf-store';
import { getPdfReadingProgress, savePdfReadingProgress } from '@/lib/pdf-progress';
import { loadPdfDocumentFromBlob } from '@/lib/pdfjs';
import PdfPage from '@/components/pdf/PdfPage';
import type { PDFDocumentProxy } from 'pdfjs-dist/types/src/display/api';

interface PdfReaderViewProps {
  novel: Novel;
  onBack: () => void;
}

const PdfReaderView = ({ novel, onBack }: PdfReaderViewProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [scrollRoot, setScrollRoot] = useState<HTMLDivElement | null>(null);
  const [pageCount, setPageCount] = useState(novel.pageCount ?? 0);
  const [currentPage, setCurrentPage] = useState(1);

  const setScrollContainer = useCallback((node: HTMLDivElement | null) => {
    scrollRef.current = node;
    setScrollRoot(node);
  }, []);

  useEffect(() => {
    let active = true;
    let loadedPdf: PDFDocumentProxy | null = null;

    void getPdfDocument(novel.id)
      .then((document) => {
        if (!active) return;
        if (!document) {
          setError('This PDF could not be found in local storage.');
          return;
        }
        return loadPdfDocumentFromBlob(document.blob);
      })
      .then((loadedDocument) => {
        if (!active || !loadedDocument) return;
        loadedPdf = loadedDocument;
        setPdf(loadedDocument);
        setPageCount(loadedDocument.numPages);

        if (novel.pageCount !== loadedDocument.numPages) {
          saveNovel({
            ...novel,
            pageCount: loadedDocument.numPages,
          });
        }
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Failed to load PDF');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      void loadedPdf?.destroy();
    };
  }, [novel]);

  useEffect(() => {
    const container = scrollRoot;
    if (!container) return;

    const updateWidth = () => {
      setContainerWidth(container.clientWidth);
    };

    updateWidth();
    const observer = new ResizeObserver(() => updateWidth());
    observer.observe(container);
    return () => observer.disconnect();
  }, [scrollRoot]);

  useEffect(() => {
    if (!pdf || !scrollRef.current) return;

    const { pageNumber, scrollTop } = getPdfReadingProgress(novel.id);
    setCurrentPage(Math.min(Math.max(pageNumber, 1), pdf.numPages));

    const frame = window.requestAnimationFrame(() => {
      const container = scrollRoot;
      if (!container) return;
      container.scrollTop = scrollTop;
    });

    return () => window.cancelAnimationFrame(frame);
  }, [novel.id, pdf, scrollRoot]);

  useEffect(() => {
    const container = scrollRoot;
    if (!container || !pdf) return;

    const handleScroll = () => {
      const pageNodes = Array.from(
        container.querySelectorAll<HTMLElement>('[data-pdf-page]'),
      );

      let nearestPage = 1;
      for (const node of pageNodes) {
        const pageNumber = Number(node.dataset.pdfPage);
        if (!Number.isFinite(pageNumber)) continue;
        if (node.offsetTop - container.scrollTop <= 120) {
          nearestPage = pageNumber;
        } else {
          break;
        }
      }

      setCurrentPage(nearestPage);

      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        savePdfReadingProgress(novel.id, nearestPage, container.scrollTop);
      }, 300);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [novel.id, pdf, scrollRoot]);

  const subtitle = useMemo(() => {
    if (pageCount > 0) {
      return `${pageCount} ${pageCount === 1 ? 'page' : 'pages'} local PDF`;
    }
    if (!novel.sourceFileSize) return 'Local PDF';
    const megabytes = (novel.sourceFileSize / 1024 / 1024).toFixed(1);
    return `${megabytes} MB local PDF`;
  }, [novel.sourceFileSize, pageCount]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="font-sans-ui text-sm text-muted-foreground">Opening PDF…</p>
        </div>
      </div>
    );
  }

  if (error || !pdf) {
    return (
      <div className="min-h-screen bg-background px-4 py-10">
        <div className="max-w-3xl mx-auto">
          <Button variant="ghost" onClick={onBack} className="font-sans-ui mb-6">
            Back to library
          </Button>
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <FileText className="w-10 h-10 text-muted-foreground/50 mx-auto mb-4" />
            <h1 className="font-sans-ui font-semibold text-xl text-foreground">{novel.title}</h1>
            <p className="font-sans-ui text-sm text-muted-foreground mt-2">
              {error ?? 'The PDF could not be opened.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background flex flex-col">
      <div className="border-b border-border bg-card/80 backdrop-blur-sm px-3 sm:px-4 py-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <Button variant="ghost" onClick={onBack} className="font-sans-ui -ml-3 mb-1">
            Back to library
          </Button>
          <h1 className="font-sans-ui font-semibold text-base text-foreground truncate">{novel.title}</h1>
          <p className="font-sans-ui text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <div className="hidden sm:block text-right">
          <p className="font-sans-ui text-xs uppercase tracking-wide text-muted-foreground">PDF Reader</p>
          <p className="font-sans-ui text-xs text-muted-foreground">
            Page {currentPage} of {pageCount || pdf.numPages}
          </p>
        </div>
      </div>

      <div ref={setScrollContainer} className="flex-1 overflow-y-auto bg-muted/20">
        <div className="max-w-5xl mx-auto px-4 py-6 sm:px-6 sm:py-8 space-y-6">
          {Array.from({ length: pdf.numPages }, (_, index) => (
            <PdfPage
              key={index + 1}
              pdf={pdf}
              pageNumber={index + 1}
              containerWidth={containerWidth}
              scrollRoot={scrollRoot}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default PdfReaderView;
