import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
    storage: {
      from: vi.fn(),
    },
    from: vi.fn(),
  },
}));

// Mock pdf-store
vi.mock('@/lib/pdf-store', () => ({
  savePdfDocument: vi.fn().mockResolvedValue(undefined),
}));

import { supabase } from '@/integrations/supabase/client';
import { savePdfDocument } from '@/lib/pdf-store';
import {
  getSignedPdfDownloadUrl,
  deletePdfFromCloud,
  fetchPdfBlobFromCloud,
  savePdfNovelMetadataToBackend,
} from './pdf-cloud-store';
import type { Novel } from './novel-store';

const mockFrom = vi.mocked(supabase.storage.from);
const mockDbFrom = vi.mocked(supabase.from);

function makeStorageMock(overrides: Record<string, unknown> = {}) {
  return {
    createSignedUrl: vi.fn(),
    remove: vi.fn(),
    upload: vi.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getSignedPdfDownloadUrl', () => {
  it('returns a signed URL when supabase succeeds', async () => {
    const storageMock = makeStorageMock({
      createSignedUrl: vi.fn().mockResolvedValue({
        data: { signedUrl: 'https://example.com/signed' },
        error: null,
      }),
    });
    mockFrom.mockReturnValue(storageMock as never);

    const url = await getSignedPdfDownloadUrl('user-pdfs', 'uid/novel-1.pdf');
    expect(url).toBe('https://example.com/signed');
    expect(storageMock.createSignedUrl).toHaveBeenCalledWith('uid/novel-1.pdf', 3600);
  });

  it('throws when supabase returns an error', async () => {
    const storageMock = makeStorageMock({
      createSignedUrl: vi.fn().mockResolvedValue({
        data: null,
        error: new Error('Storage error'),
      }),
    });
    mockFrom.mockReturnValue(storageMock as never);

    await expect(getSignedPdfDownloadUrl('user-pdfs', 'uid/novel-1.pdf')).rejects.toThrow('Storage error');
  });
});

describe('deletePdfFromCloud', () => {
  it('calls storage.remove with the correct path', async () => {
    const storageMock = makeStorageMock({
      remove: vi.fn().mockResolvedValue({ error: null }),
    });
    mockFrom.mockReturnValue(storageMock as never);

    await deletePdfFromCloud('user-pdfs', 'uid/novel-1.pdf');
    expect(storageMock.remove).toHaveBeenCalledWith(['uid/novel-1.pdf']);
  });

  it('swallows "not found" errors', async () => {
    const storageMock = makeStorageMock({
      remove: vi.fn().mockResolvedValue({ error: { message: 'Object not found' } }),
    });
    mockFrom.mockReturnValue(storageMock as never);

    await expect(deletePdfFromCloud('user-pdfs', 'uid/novel-1.pdf')).resolves.toBeUndefined();
  });

  it('throws non-not-found errors', async () => {
    const storageMock = makeStorageMock({
      remove: vi.fn().mockResolvedValue({ error: { message: 'Permission denied' } }),
    });
    mockFrom.mockReturnValue(storageMock as never);

    await expect(deletePdfFromCloud('user-pdfs', 'uid/novel-1.pdf')).rejects.toMatchObject({
      message: 'Permission denied',
    });
  });
});

describe('fetchPdfBlobFromCloud', () => {
  it('fetches blob, calls savePdfDocument, and returns the blob', async () => {
    const pdfBlob = new Blob(['%PDF-1.4'], { type: 'application/pdf' });
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(pdfBlob),
    }) as typeof fetch;

    const result = await fetchPdfBlobFromCloud(
      'https://example.com/signed',
      'novel-1',
      'test.pdf',
      'application/pdf',
      100,
      '2026-04-21T00:00:00.000Z',
    );

    expect(result).toBe(pdfBlob);
    expect(vi.mocked(savePdfDocument)).toHaveBeenCalledWith({
      novelId: 'novel-1',
      fileName: 'test.pdf',
      mimeType: 'application/pdf',
      size: 100,
      blob: pdfBlob,
      createdAt: '2026-04-21T00:00:00.000Z',
    });
  });

  it('throws when fetch fails', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
    }) as typeof fetch;

    await expect(
      fetchPdfBlobFromCloud('https://example.com/signed', 'novel-1', 'test.pdf', 'application/pdf', 100, '2026-04-21T00:00:00.000Z'),
    ).rejects.toThrow('PDF download failed: 403 Forbidden');
  });
});

describe('savePdfNovelMetadataToBackend', () => {
  it('upserts novels row with PDF columns', async () => {
    const upsertMock = vi.fn().mockResolvedValue({ error: null });
    mockDbFrom.mockReturnValue({ upsert: upsertMock } as never);

    const novel: Novel = {
      id: 'novel-1',
      title: 'My PDF',
      url: 'pdf://novel-1',
      chapters: [],
      savedAt: '2026-04-21T00:00:00.000Z',
      sourceType: 'pdf',
      readerMode: 'pdf',
      sourceFileName: 'my-pdf.pdf',
      sourceFileSize: 1024,
    };

    await savePdfNovelMetadataToBackend(novel, 'user-123', { bucket: 'user-pdfs', path: 'user-123/novel-1.pdf' });

    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-123',
        local_id: 'novel-1',
        source_type: 'pdf',
        storage_bucket: 'user-pdfs',
        storage_path: 'user-123/novel-1.pdf',
        source_file_name: 'my-pdf.pdf',
        source_file_size: 1024,
      }),
      { onConflict: 'user_id,local_id' },
    );
  });

  it('throws when supabase returns an error', async () => {
    const upsertMock = vi.fn().mockResolvedValue({ error: new Error('DB error') });
    mockDbFrom.mockReturnValue({ upsert: upsertMock } as never);

    const novel: Novel = {
      id: 'novel-1',
      title: 'My PDF',
      url: 'pdf://novel-1',
      chapters: [],
      savedAt: '2026-04-21T00:00:00.000Z',
    };

    await expect(
      savePdfNovelMetadataToBackend(novel, 'user-123', { bucket: 'user-pdfs', path: 'user-123/novel-1.pdf' }),
    ).rejects.toThrow('DB error');
  });
});
