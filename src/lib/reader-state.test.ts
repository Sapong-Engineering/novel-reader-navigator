import { describe, expect, it } from 'vitest';
import { chapterNeedsRefresh, mergeNovelWithLocalContent } from './reader-state';
import type { Novel } from './novel-store';

describe('mergeNovelWithLocalContent', () => {
  it('preserves locally fetched chapter content when syncing metadata from backend', () => {
    const localNovel: Novel = {
      id: 'novel-1',
      title: 'Local',
      url: 'https://example.com/local',
      savedAt: '2026-04-12T00:00:00.000Z',
      chapters: [
        {
          id: 'ch-1',
          title: 'Chapter 1',
          url: 'https://example.com/1',
          content: 'local chapter body',
          savedAt: '2026-04-12T01:00:00.000Z',
        },
      ],
    };

    const syncedNovel: Novel = {
      id: 'novel-1',
      title: 'Remote',
      url: 'https://example.com/local',
      savedAt: '2026-04-12T02:00:00.000Z',
      chapters: [
        {
          id: 'ch-1',
          title: 'Chapter One',
          url: 'https://example.com/1',
          content: 'remote chapter body',
          savedAt: '2026-04-12T02:00:00.000Z',
        },
      ],
    };

    const merged = mergeNovelWithLocalContent(localNovel, syncedNovel);

    expect(merged.title).toBe('Remote');
    expect(merged.chapters[0]).toMatchObject({
      id: 'ch-1',
      title: 'Chapter One',
      content: 'local chapter body',
      savedAt: '2026-04-12T01:00:00.000Z',
    });
  });

  it('retains local-only chapters that do not exist remotely', () => {
    const localNovel: Novel = {
      id: 'novel-1',
      title: 'Local',
      url: 'https://example.com/local',
      savedAt: '2026-04-12T00:00:00.000Z',
      chapters: [
        { id: 'ch-local', title: 'Bonus', url: 'https://example.com/bonus', content: 'bonus' },
      ],
    };

    const syncedNovel: Novel = {
      id: 'novel-1',
      title: 'Remote',
      url: 'https://example.com/local',
      savedAt: '2026-04-12T02:00:00.000Z',
      chapters: [
        { id: 'ch-1', title: 'Chapter 1', url: 'https://example.com/1' },
      ],
    };

    const merged = mergeNovelWithLocalContent(localNovel, syncedNovel);

    expect(merged.chapters.map((chapter) => chapter.id)).toEqual(['ch-1', 'ch-local']);
  });
});

describe('chapterNeedsRefresh', () => {
  it('detects when the chapter content in novel state has changed', () => {
    expect(
      chapterNeedsRefresh(
        { id: 'ch-1', title: 'Chapter 1', url: 'https://example.com/1', content: undefined },
        { id: 'ch-1', title: 'Chapter 1', url: 'https://example.com/1', content: 'loaded remotely' },
      ),
    ).toBe(true);
  });

  it('does not refresh when the active chapter already matches the novel state', () => {
    expect(
      chapterNeedsRefresh(
        {
          id: 'ch-1',
          title: 'Chapter 1',
          url: 'https://example.com/1',
          content: 'same content',
          savedAt: '2026-04-12T02:00:00.000Z',
        },
        {
          id: 'ch-1',
          title: 'Chapter 1',
          url: 'https://example.com/1',
          content: 'same content',
          savedAt: '2026-04-12T02:00:00.000Z',
        },
      ),
    ).toBe(false);
  });
});
