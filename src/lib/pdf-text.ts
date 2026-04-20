import type { PDFPageProxy, TextItem, TextMarkedContent } from 'pdfjs-dist/types/src/display/api';

export type PdfTextSource = 'native' | 'ocr';

export interface PdfTextBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PdfAudioSegment {
  id: string;
  novelId: string;
  pageNumber: number;
  indexOnPage: number;
  text: string;
  boxes: PdfTextBox[];
  source: PdfTextSource;
}

export interface StoredPdfPageText {
  id: string;
  novelId: string;
  pageNumber: number;
  source: PdfTextSource;
  segments: PdfAudioSegment[];
  extractedAt: string;
}

export interface PdfTextLine {
  text: string;
  boxes: PdfTextBox[];
}

const DEFAULT_MAX_SEGMENT_CHARS = 1_200;
const DEFAULT_MIN_SEGMENT_CHARS = 280;

function isTextItem(item: TextItem | TextMarkedContent): item is TextItem {
  return typeof (item as TextItem).str === 'string';
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

function normalizeBox(left: number, top: number, width: number, height: number, pageWidth: number, pageHeight: number): PdfTextBox {
  const safeLeft = Math.min(Math.max(left, 0), pageWidth);
  const safeTop = Math.min(Math.max(top, 0), pageHeight);
  const safeRight = Math.min(Math.max(left + width, safeLeft), pageWidth);
  const safeBottom = Math.min(Math.max(top + height, safeTop), pageHeight);

  return {
    x: clampPercent((safeLeft / pageWidth) * 100),
    y: clampPercent((safeTop / pageHeight) * 100),
    width: clampPercent(((safeRight - safeLeft) / pageWidth) * 100),
    height: clampPercent(((safeBottom - safeTop) / pageHeight) * 100),
  };
}

function shouldInsertSpace(previous: string, next: string): boolean {
  if (!previous || /\s$/.test(previous) || /^\s/.test(next)) return false;
  if (/^[,.;:!?)]/.test(next)) return false;
  if (/[(["']$/.test(previous)) return false;
  return true;
}

function mergeLineText(previous: string, next: string): string {
  if (!previous) return next;
  return `${previous}${shouldInsertSpace(previous, next) ? ' ' : ''}${next}`;
}

function multiplyTransforms(m1: number[], m2: unknown[]): number[] {
  const a = m2.map((value) => Number(value) || 0);
  return [
    m1[0] * a[0] + m1[2] * a[1],
    m1[1] * a[0] + m1[3] * a[1],
    m1[0] * a[2] + m1[2] * a[3],
    m1[1] * a[2] + m1[3] * a[3],
    m1[0] * a[4] + m1[2] * a[5] + m1[4],
    m1[1] * a[4] + m1[3] * a[5] + m1[5],
  ];
}

function textItemToBox(item: TextItem, viewport: ReturnType<PDFPageProxy['getViewport']>): PdfTextBox | null {
  const transform = multiplyTransforms(viewport.transform, item.transform);
  const left = Number(transform[4]);
  const baselineY = Number(transform[5]);
  const fontHeight = Math.max(
    Math.hypot(Number(transform[2]) || 0, Number(transform[3]) || 0),
    Math.abs(item.height * viewport.scale),
    8,
  );
  const width = Math.max(Math.abs(item.width * viewport.scale), item.str.trim().length * fontHeight * 0.35, 1);
  const top = baselineY - fontHeight;

  if (!Number.isFinite(left) || !Number.isFinite(top)) return null;
  return normalizeBox(left, top, width, fontHeight * 1.15, viewport.width, viewport.height);
}

function getLineBounds(boxes: PdfTextBox[]): PdfTextBox | null {
  if (boxes.length === 0) return null;
  const left = Math.min(...boxes.map((box) => box.x));
  const top = Math.min(...boxes.map((box) => box.y));
  const right = Math.max(...boxes.map((box) => box.x + box.width));
  const bottom = Math.max(...boxes.map((box) => box.y + box.height));
  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  };
}

function pushLine(lines: PdfTextLine[], line: PdfTextLine): PdfTextLine {
  const text = line.text.replace(/\s+/g, ' ').trim();
  if (text) {
    lines.push({
      text,
      boxes: getLineBounds(line.boxes) ? [getLineBounds(line.boxes)!] : line.boxes,
    });
  }
  return { text: '', boxes: [] };
}

export function buildPdfAudioSegments(
  novelId: string,
  pageNumber: number,
  lines: PdfTextLine[],
  source: PdfTextSource = 'native',
  maxSegmentChars = DEFAULT_MAX_SEGMENT_CHARS,
): PdfAudioSegment[] {
  const segments: PdfAudioSegment[] = [];
  let text = '';
  let boxes: PdfTextBox[] = [];

  const flush = () => {
    const cleanText = text.replace(/\s+/g, ' ').trim();
    if (!cleanText) return;
    const indexOnPage = segments.length;
    segments.push({
      id: `${novelId}:p${pageNumber}:s${indexOnPage}:${source}`,
      novelId,
      pageNumber,
      indexOnPage,
      text: cleanText,
      boxes,
      source,
    });
    text = '';
    boxes = [];
  };

  for (const line of lines) {
    const cleanLine = line.text.replace(/\s+/g, ' ').trim();
    if (!cleanLine) continue;

    const wouldExceedLimit = text.length > 0 && text.length + cleanLine.length + 1 > maxSegmentChars;
    const endsLikeParagraph = /[.!?]["')\]]?$/.test(text.trim()) && text.length >= DEFAULT_MIN_SEGMENT_CHARS;
    if (wouldExceedLimit || endsLikeParagraph) {
      flush();
    }

    text = text ? `${text} ${cleanLine}` : cleanLine;
    boxes = boxes.concat(line.boxes);
  }

  flush();
  return segments;
}

export async function extractPdfPageText(
  page: PDFPageProxy,
  novelId: string,
  pageNumber: number,
): Promise<StoredPdfPageText> {
  const viewport = page.getViewport({ scale: 1 });
  const textContent = await page.getTextContent();
  const lines: PdfTextLine[] = [];
  let currentLine: PdfTextLine = { text: '', boxes: [] };

  for (const item of textContent.items) {
    if (!isTextItem(item)) continue;
    const itemText = item.str.replace(/\s+/g, ' ');
    if (itemText.trim()) {
      currentLine.text = mergeLineText(currentLine.text, itemText);
      const box = textItemToBox(item, viewport);
      if (box) currentLine.boxes.push(box);
    }
    if (item.hasEOL) {
      currentLine = pushLine(lines, currentLine);
    }
  }

  currentLine = pushLine(lines, currentLine);

  return {
    id: `${novelId}:${pageNumber}:native`,
    novelId,
    pageNumber,
    source: 'native',
    segments: buildPdfAudioSegments(novelId, pageNumber, lines, 'native'),
    extractedAt: new Date().toISOString(),
  };
}

export function hasReadablePdfText(pageText: StoredPdfPageText | null | undefined): boolean {
  if (!pageText) return false;
  return pageText.segments.reduce((total, segment) => total + segment.text.length, 0) >= 40;
}
