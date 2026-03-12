import { render, screen, fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ChapterList from './ChapterList';

const chapters = [
  { id: 'ch-1', title: 'Chapter 1', url: 'https://example.com/1' },
  { id: 'ch-2', title: 'Chapter 2', url: 'https://example.com/2' },
  { id: 'ch-3', title: 'Side Story', url: 'https://example.com/3' },
];

describe('ChapterList', () => {
  beforeEach(() => {
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  it('auto-scrolls the active chapter into view', () => {
    const { rerender } = render(
      <ChapterList
        chapters={chapters}
        activeChapterId="ch-1"
        onSelectChapter={() => {}}
      />,
    );

    const scrollSpy = vi.spyOn(HTMLElement.prototype, 'scrollIntoView');

    rerender(
      <ChapterList
        chapters={chapters}
        activeChapterId="ch-2"
        onSelectChapter={() => {}}
      />,
    );

    expect(scrollSpy).toHaveBeenCalled();
  });

  it('does not crash when the active chapter is filtered out', () => {
    render(
      <ChapterList
        chapters={chapters}
        activeChapterId="ch-2"
        onSelectChapter={() => {}}
      />,
    );

    fireEvent.change(screen.getByLabelText('Search chapters'), {
      target: { value: 'Side Story' },
    });

    expect(screen.getByText('1 result')).toBeInTheDocument();
  });

  it('does not auto-scroll while bookmarks tab is active', () => {
    render(
      <ChapterList
        chapters={chapters}
        activeChapterId="ch-2"
        onSelectChapter={() => {}}
        bookmarks={[{
          id: 'bookmark-1',
          chapterId: 'ch-2',
          chapterTitle: 'Chapter 2',
          scrollPosition: 100,
          createdAt: new Date().toISOString(),
        }]}
      />,
    );

    const scrollSpy = vi.spyOn(HTMLElement.prototype, 'scrollIntoView');
    fireEvent.click(screen.getByRole('tab', { name: /bookmarks/i }));

    expect(scrollSpy).not.toHaveBeenCalled();
  });
});
