import { useEffect, useMemo, useRef, useState } from 'react';
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist/types/src/display/api';
import { Loader2 } from 'lucide-react';
import type { PdfAudioSegment } from '@/lib/pdf-text';

interface PdfPageProps {
  pdf: PDFDocumentProxy;
  pageNumber: number;
  containerWidth: number;
  scrollRoot: HTMLElement | null;
  activeSegment?: PdfAudioSegment | null;
}

const PREVIEW_ASPECT_RATIO = 1.35;

const PdfPage = ({ pdf, pageNumber, containerWidth, scrollRoot, activeSegment }: PdfPageProps) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isNearViewport, setIsNearViewport] = useState(pageNumber <= 2);
  const [isRendering, setIsRendering] = useState(pageNumber <= 1);
  const [renderedHeight, setRenderedHeight] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const placeholderHeight = useMemo(() => {
    const safeWidth = Math.max(containerWidth, 240);
    return renderedHeight ?? Math.round(safeWidth * PREVIEW_ASPECT_RATIO);
  }, [containerWidth, renderedHeight]);

  useEffect(() => {
    const element = wrapperRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setIsNearViewport(true);
        }
      },
      { root: scrollRoot, rootMargin: '1200px 0px' },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [scrollRoot]);

  useEffect(() => {
    if (!isNearViewport || containerWidth <= 0) return;

    let active = true;
    let renderTask: RenderTask | null = null;

    async function renderPage() {
      setIsRendering(true);
      setError(null);

      try {
        const page = await pdf.getPage(pageNumber);
        if (!active) return;

        const baseViewport = page.getViewport({ scale: 1 });
        const availableWidth = Math.max(containerWidth - 32, 200);
        const scale = availableWidth / baseViewport.width;
        const viewport = page.getViewport({ scale });

        const canvas = canvasRef.current;
        if (!canvas) return;
        const context = canvas.getContext('2d');
        if (!context) {
          throw new Error('Canvas rendering is unavailable in this browser.');
        }

        const outputScale = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;

        context.setTransform(outputScale, 0, 0, outputScale, 0, 0);
        renderTask = page.render({ canvasContext: context, viewport });
        await renderTask.promise;

        if (!active) return;
        setRenderedHeight(viewport.height);
        page.cleanup();
      } catch (err) {
        if (!active) return;
        if ((err as { name?: string }).name === 'RenderingCancelledException') return;
        setError(err instanceof Error ? err.message : 'Failed to render page.');
      } finally {
        if (active) setIsRendering(false);
      }
    }

    void renderPage();

    return () => {
      active = false;
      renderTask?.cancel();
    };
  }, [containerWidth, isNearViewport, pageNumber, pdf]);

  return (
    <div
      ref={wrapperRef}
      data-pdf-page={pageNumber}
      className="w-full rounded-2xl border border-border bg-card/60 shadow-sm overflow-hidden"
      style={{ minHeight: `${placeholderHeight}px` }}
    >
      <div className="px-4 py-2 border-b border-border/60 bg-card/80 backdrop-blur-sm">
        <p className="font-sans-ui text-xs uppercase tracking-wide text-muted-foreground">
          Page {pageNumber}
        </p>
      </div>

      <div className="p-4 flex justify-center">
        {error ? (
          <div className="w-full rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-8 text-center">
            <p className="font-sans-ui text-sm text-destructive">{error}</p>
          </div>
        ) : (
          <div className="relative" data-pdf-canvas-shell>
            <canvas
              ref={canvasRef}
              className={`max-w-full rounded-lg bg-white shadow-sm ${isRendering ? 'opacity-60' : 'opacity-100'} transition-opacity`}
            />
            {activeSegment?.pageNumber === pageNumber && (
              <div className="pointer-events-none absolute inset-0 rounded-lg overflow-hidden">
                {activeSegment.boxes.map((box, index) => (
                  <div
                    key={`${activeSegment.id}-${index}`}
                    className="absolute rounded-sm bg-primary/20 ring-1 ring-primary/35 transition-all"
                    style={{
                      left: `${box.x}%`,
                      top: `${box.y}%`,
                      width: `${box.width}%`,
                      height: `${box.height}%`,
                    }}
                  />
                ))}
              </div>
            )}
            {isRendering && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/30 rounded-lg">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PdfPage;
