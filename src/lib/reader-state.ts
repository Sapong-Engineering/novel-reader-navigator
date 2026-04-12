import type { Chapter, Novel } from './novel-store';

export function mergeNovelWithLocalContent(localNovel: Novel | null, syncedNovel: Novel): Novel {
  if (!localNovel) return syncedNovel;

  const localById = new Map(localNovel.chapters.map((chapter) => [chapter.id, chapter]));
  const mergedChapters = syncedNovel.chapters.map((syncedChapter) => {
    const localChapter = localById.get(syncedChapter.id);
    if (!localChapter) return syncedChapter;

    return {
      ...syncedChapter,
      content: localChapter.content ?? syncedChapter.content,
      savedAt: localChapter.savedAt ?? syncedChapter.savedAt,
    };
  });

  const syncedIds = new Set(syncedNovel.chapters.map((chapter) => chapter.id));
  for (const localChapter of localNovel.chapters) {
    if (!syncedIds.has(localChapter.id)) {
      mergedChapters.push(localChapter);
    }
  }

  return { ...syncedNovel, chapters: mergedChapters };
}

export function chapterNeedsRefresh(
  activeChapter: Chapter | null,
  novelChapter: Chapter | undefined,
): novelChapter is Chapter {
  if (!activeChapter || !novelChapter) return false;

  return (
    activeChapter.title !== novelChapter.title ||
    activeChapter.url !== novelChapter.url ||
    activeChapter.content !== novelChapter.content ||
    activeChapter.savedAt !== novelChapter.savedAt
  );
}
