import { beforeEach, describe, expect, it, vi } from 'vitest';
import { normalizePdfTitle } from './pdf-import';

describe('normalizePdfTitle', () => {
  it('removes the extension and normalizes separators', () => {
    expect(normalizePdfTitle('My_Book-2026.pdf')).toBe('My Book 2026');
  });

  it('falls back to a readable default for empty names', () => {
    expect(normalizePdfTitle('.pdf')).toBe('Untitled PDF');
  });
});

// Mock heavy dependencies so importPdfFile can be tested in isolation
vi.mock('@/lib/pdf-store', () => ({
  savePdfDocument: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/pdf-cloud-store', () => ({
  uploadPdfToCloud: vi.fn(),
  savePdfNovelMetadataToBackend: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/offline-queue', () => ({
  enqueue: vi.fn(),
}));

import { importPdfFile } from './pdf-import';
import { uploadPdfToCloud, savePdfNovelMetadataToBackend } from '@/lib/pdf-cloud-store';
import { enqueue } from '@/lib/offline-queue';

const PDF_CONTENT = '%PDF-1.4 fake content for testing';

function makePdfFile(name = 'test.pdf', content = PDF_CONTENT): File {
  return new File([content], name, { type: 'application/pdf' });
}

describe('importPdfFile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: upload succeeds
    vi.mocked(uploadPdfToCloud).mockResolvedValue({ bucket: 'user-pdfs', path: 'uid/novel-1.pdf' });
    // Simulate online
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
  });

  it('sets isLocalOnly: false and storagePath when upload succeeds', async () => {
    const { novel, uploadedToCloud } = await importPdfFile(makePdfFile(), 'user-123');
    expect(uploadedToCloud).toBe(true);
    expect(novel.isLocalOnly).toBe(false);
    expect(novel.storagePath).toBe('uid/novel-1.pdf');
    expect(novel.storageBucket).toBe('user-pdfs');
    expect(vi.mocked(savePdfNovelMetadataToBackend)).toHaveBeenCalledOnce();
  });

  it('keeps isLocalOnly: true and enqueues retry when upload fails', async () => {
    vi.mocked(uploadPdfToCloud).mockRejectedValue(new Error('network error'));

    const { novel, uploadedToCloud } = await importPdfFile(makePdfFile(), 'user-123');
    expect(uploadedToCloud).toBe(false);
    expect(novel.isLocalOnly).toBe(true);
    expect(novel.storagePath).toBeUndefined();
    expect(vi.mocked(enqueue)).toHaveBeenCalledWith('uploadPdf', { novelId: novel.id });
  });

  it('keeps isLocalOnly: true and enqueues when offline', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });

    const { novel, uploadedToCloud } = await importPdfFile(makePdfFile(), 'user-123');
    expect(uploadedToCloud).toBe(false);
    expect(novel.isLocalOnly).toBe(true);
    expect(vi.mocked(uploadPdfToCloud)).not.toHaveBeenCalled();
    expect(vi.mocked(enqueue)).toHaveBeenCalledWith('uploadPdf', { novelId: novel.id });
  });

  it('keeps isLocalOnly: true and does NOT enqueue when userId is null (not logged in)', async () => {
    const { novel, uploadedToCloud } = await importPdfFile(makePdfFile(), null);
    expect(uploadedToCloud).toBe(false);
    expect(novel.isLocalOnly).toBe(true);
    expect(vi.mocked(uploadPdfToCloud)).not.toHaveBeenCalled();
    expect(vi.mocked(enqueue)).not.toHaveBeenCalled();
  });

  it('rejects invalid files (wrong extension + mime)', async () => {
    const badFile = new File(['not a pdf'], 'doc.txt', { type: 'text/plain' });
    await expect(importPdfFile(badFile, null)).rejects.toThrow('valid PDF file');
  });

  it('rejects files without %PDF- header', async () => {
    const badFile = new File(['not a pdf content'], 'fake.pdf', { type: 'application/pdf' });
    await expect(importPdfFile(badFile, null)).rejects.toThrow('readable PDF');
  });
});
