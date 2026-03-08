

## Plan: Dynamic Drop Cap on First Story Paragraph

### Problem
The drop cap is applied to `i === 0` (the first `<p>` element), which is often the chapter title line (e.g., "Chapter 2: RR") rather than the actual story text.

### Solution
Two-pronged fix:

**1. Frontend (`src/components/ReaderView.tsx`, line 163-168)**
Instead of blindly applying `reader-first-paragraph` to `i === 0`, find the first paragraph that looks like actual story content — skip paragraphs that match chapter title patterns like `Chapter N`, `Ch. N`, or are very short (< 40 chars and look like headers).

```tsx
// Helper: detect if a paragraph is a chapter title/header, not story text
const isChapterTitle = (text: string) => {
  const t = text.trim();
  return /^(chapter|ch\.?|episode|part|book|volume)\s+\d+/i.test(t) 
    || (t.length < 50 && /^[#\*]/.test(t));
};

// In the map, track whether we've found the first real paragraph
let foundFirst = false;
chapter.content.split('\n\n').map((para, i) => {
  const trimmed = para.trim();
  if (!trimmed) return null;
  const isFirst = !foundFirst && !isChapterTitle(trimmed) && trimmed.length > 30;
  if (isFirst) foundFirst = true;
  return <p key={i} className={isFirst ? 'reader-first-paragraph' : ''}>{trimmed}</p>;
})
```

**2. Backend cleaner (`supabase/functions/shared/chapter-cleaner.ts`)**
Add a generic post-cleaning step in `cleanChapterContent` that separates the chapter title from the first story paragraph with a double newline if they're merged, ensuring the frontend logic can distinguish them.

### Scope
- Edit `src/components/ReaderView.tsx` lines 163-168 — smart first-paragraph detection
- Minor tweak to chapter-cleaner.ts — ensure title and body are on separate paragraphs
- Works for all adapters/sites since it's pattern-based, not site-specific

