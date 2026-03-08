

## Review: Reader Formatting Improvements

After reviewing the codebase, the reader is functional but has room for a more polished, book-like reading experience. Here's what I'd improve:

### Current Issues
- Chapter title styling is plain (basic bold text, no visual separation)
- Paragraph rendering splits on `\n\n` but lacks typographic refinement (no drop cap, no first-line indent, uniform spacing)
- Bottom navigation bar feels utilitarian rather than elegant
- No visual breathing room — content jumps straight from title to body
- Progress bar at top is a raw colored strip
- Floating scroll buttons look generic
- No smooth fade-in for content paragraphs

### Plan

**1. Elevate the chapter header**
- Add a decorative separator (thin ornamental divider) below the chapter title
- Style the title with slightly larger size, letter-spacing, and a subtle fade-in animation
- Add the novel title as a small, muted subtitle above the chapter title

**2. Refine content typography**
- Add `text-indent` on paragraphs for a classic book feel (first paragraph excluded via CSS `:first-child`)
- Increase `space-y` between paragraphs from `space-y-4` to `space-y-5`
- Add `hyphens: auto` and `text-align: justify` for clean text blocks (with `text-rendering: optimizeLegibility`)
- Optional drop cap on the first paragraph using a CSS `::first-letter` utility class

**3. Polish the progress bar**
- Make it thinner (h-0.5) with a gradient from primary to accent
- Add a subtle glow effect on the leading edge

**4. Improve bottom navigation bar**
- Add more vertical padding and a subtle top shadow instead of a hard border
- Style prev/next buttons with softer, pill-shaped outlines
- Center the chapter title with better truncation and a small chapter number indicator

**5. Refine floating scroll buttons**
- Use a softer shadow and match the reader background
- Add a fade transition on appear/disappear

**6. Empty/loading states**
- Add a book icon or subtle illustration to the "Select a chapter" placeholder
- Improve loading spinner with a pulsing book animation

### Files to Edit
- `src/components/ReaderView.tsx` — main layout, typography, navigation bar, scroll buttons
- `src/index.css` — add drop-cap utility, text-indent utility, progress bar gradient styles

