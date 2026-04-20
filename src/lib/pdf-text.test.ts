import { describe, expect, it } from 'vitest';
import { buildPdfAudioSegments, hasReadablePdfText, type PdfTextLine, type StoredPdfPageText } from './pdf-text';

const box = { x: 10, y: 10, width: 40, height: 2 };

describe('pdf text segmentation', () => {
  it('keeps short page text as a readable segment', () => {
    const lines: PdfTextLine[] = [
      { text: 'This is the first line of the PDF.', boxes: [box] },
      { text: 'This is the second line.', boxes: [{ ...box, y: 14 }] },
    ];

    const segments = buildPdfAudioSegments('novel-1', 2, lines);

    expect(segments).toHaveLength(1);
    expect(segments[0]).toMatchObject({
      id: 'novel-1:p2:s0:native',
      pageNumber: 2,
      indexOnPage: 0,
      source: 'native',
      text: 'This is the first line of the PDF. This is the second line.',
    });
    expect(segments[0].boxes).toHaveLength(2);
  });

  it('splits long text into bounded audio segments', () => {
    const lines = Array.from({ length: 8 }, (_, index) => ({
      text: `Sentence ${index + 1} has enough words to make the audio segmentation useful for a PDF reader.`,
      boxes: [{ ...box, y: 10 + index * 3 }],
    }));

    const segments = buildPdfAudioSegments('novel-1', 1, lines, 'native', 160);

    expect(segments.length).toBeGreaterThan(1);
    expect(segments.every((segment) => segment.text.length <= 180)).toBe(true);
  });

  it('detects whether extracted text is usable for audio', () => {
    const pageText: StoredPdfPageText = {
      id: 'novel-1:1:native',
      novelId: 'novel-1',
      pageNumber: 1,
      source: 'native',
      extractedAt: new Date().toISOString(),
      segments: buildPdfAudioSegments('novel-1', 1, [
        { text: 'This page has enough selectable text to read aloud comfortably.', boxes: [box] },
      ]),
    };

    expect(hasReadablePdfText(pageText)).toBe(true);
    expect(hasReadablePdfText({ ...pageText, segments: [] })).toBe(false);
  });
});
