# Implementation Plan: Novel Reader Improvements

## Overview

This implementation plan transforms the Novel Reader web application from a basic scraping tool into a robust, production-ready application. The improvements address critical bugs, architectural weaknesses, security vulnerabilities, and user experience gaps across the entire stack.

The implementation is organized into seven major phases, each building on the previous work to ensure a stable, incremental development process. Critical bug fixes and foundational infrastructure are implemented first, followed by architectural improvements, UI/UX enhancements, code quality improvements, and comprehensive testing.

## Implementation Strategy

- Each task builds on previous tasks to ensure incremental progress
- Property-based tests are included as optional sub-tasks to validate correctness properties
- Checkpoints ensure validation at key milestones
- All tasks reference specific requirements for traceability
- TypeScript is used throughout (React 18, TypeScript, Vite, TailwindCSS)

## Tasks

### Phase 1: Critical Bug Fixes

- [ ] 1. Fix regex escape bug in chapter URL extraction
  - Open `supabase/functions/scrape-novel/index.ts`
  - Replace the corrupted placeholder `\\e8eb5b7c-fb50-4e8c-aed3-76083bc805c8` with correct escape sequence `\\af3cdd34-b601-4129-b1e3-324b2c8df983`
  - Implement proper URL escaping for special regex characters using `escapeRegExp` function
  - Test with URLs containing special characters (`.`, `*`, `+`, `?`, `[`, `]`, `(`, `)`, `{`, `}`, `|`, `^`, `$`, `\`)
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [ ]* 1.1 Write property test for URL pattern matching with special characters
  - **Property 1: URL Pattern Matching with Special Characters**
  - **Validates: Requirements 1.2, 1.3, 1.4**
  - Use fast-check to generate URLs with special regex characters
  - Verify regex pattern is valid and matches chapter URLs correctly
  - _Requirements: 1.2, 1.3, 1.4_

- [~] 2. Implement React Error Boundary component
  - Create `src/components/ErrorBoundary.tsx` with `ErrorBoundaryProps` and `ErrorBoundaryState` interfaces
  - Implement `componentDidCatch` lifecycle method to catch errors
  - Implement `getDerivedStateFromError` to update state on error
  - Create fallback UI component with error details and reset button
  - Log errors to console with stack traces
  - _Requirements: 2.1, 2.2, 2.3_

- [ ]* 2.1 Write property test for error boundary fallback UI
  - **Property 2: Error Boundary Displays Fallback UI**
  - **Validates: Requirements 2.2, 2.6**
  - Test that any error thrown by child component triggers fallback UI
  - Verify error doesn't propagate to parent components
  - _Requirements: 2.2, 2.6_

- [~] 3. Wrap critical components with error boundaries
  - Wrap `ReaderView` component with error boundary in reader page
  - Wrap `ChapterList` component with error boundary
  - Add top-level error boundary in `App.tsx`
  - Test error recovery by triggering errors in wrapped components
  - _Requirements: 2.4, 2.5, 2.6_

- [~] 4. Checkpoint - Verify bug fixes
  - Test regex with special character URLs
  - Trigger component errors to verify error boundaries work
  - Ensure all tests pass, ask the user if questions arise

### Phase 2: Core Infrastructure

- [~] 5. Implement URL validation service
  - Create `src/lib/validation.ts` with `ValidationResult` and `URLValidationRules` interfaces
  - Implement `validateUrl` function with protocol validation (HTTP/HTTPS only)
  - Add domain validation using URL constructor
  - Add length validation (max 2048 characters)
  - Add malicious pattern detection (javascript:, data:, vbscript:, <script)
  - Implement URL sanitization (trim whitespace, normalize protocol)
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

- [ ]* 5.1 Write property test for URL validation
  - **Property 10: URL Validation Rejects Invalid URLs**
  - **Validates: Requirements 5.1, 5.2, 5.3, 5.5, 5.6**
  - Generate invalid URLs (wrong protocol, too long, no domain, malicious patterns)
  - Verify validation fails with descriptive error messages
  - Generate valid URLs and verify validation passes
  - _Requirements: 5.1, 5.2, 5.3, 5.5, 5.6_

- [ ]* 5.2 Write property test for URL sanitization
  - **Property 11: URL Sanitization Normalization**
  - **Validates: Requirements 5.4**
  - Generate URLs with whitespace and protocol variations
  - Verify sanitization produces normalized canonical form
  - _Requirements: 5.4_

- [~] 6. Implement content sanitization service
  - Create `supabase/functions/shared/sanitization.ts`
  - Implement `sanitizeHtml` function to remove script tags
  - Remove event handler attributes (onclick, onerror, onload, etc.)
  - Remove dangerous iframe elements
  - Preserve safe formatting elements (headings, paragraphs, emphasis, lists, links)
  - Implement `sanitizeMarkdown` function for markdown content
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [ ]* 6.1 Write property test for HTML sanitization
  - **Property 12: HTML Sanitization Removes Dangerous Elements**
  - **Validates: Requirements 6.1, 6.2, 6.3, 6.5**
  - Generate HTML with script tags, event handlers, iframes
  - Verify sanitized output removes dangerous elements
  - Verify safe elements are preserved
  - _Requirements: 6.1, 6.2, 6.3, 6.5_

- [ ]* 6.2 Write property test for markdown script prevention
  - **Property 13: Markdown Rendering Prevents Script Execution**
  - **Validates: Requirements 6.4**
  - Generate markdown with embedded scripts and javascript: URLs
  - Verify no scripts execute when rendered
  - _Requirements: 6.4_

- [~] 7. Implement rate limiter utility
  - Create `src/lib/utils/rate-limiter.ts` with `RateLimiterConfig` interface
  - Implement `RateLimiter` class using token bucket algorithm
  - Add configurable requests per second (default: 2)
  - Add configurable max concurrent requests (default: 3)
  - Implement request queue for pending requests
  - Add environment variable configuration support
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ]* 7.1 Write property test for rate limiting minimum delay
  - **Property 4: Rate Limiting Enforces Minimum Delay**
  - **Validates: Requirements 3.2, 3.4**
  - Generate sequence of requests
  - Verify time between consecutive requests meets minimum delay
  - _Requirements: 3.2, 3.4_

- [~] 8. Implement retry handler utility
  - Create `src/lib/utils/retry-handler.ts` with `RetryConfig` interface
  - Implement `withRetry` function with exponential backoff
  - Calculate delay as `min(baseDelay * 2^attempt, maxDelay)`
  - Implement retry decision logic based on error type and status code
  - Respect Retry-After header for 429 responses
  - Add retry attempt logging with timestamps
  - Default to max 3 attempts
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

- [ ]* 8.1 Write property test for exponential backoff timing
  - **Property 5: Exponential Backoff Retry Timing**
  - **Validates: Requirements 4.1, 4.2**
  - Test retry delays follow exponential backoff pattern
  - Verify total retry attempts don't exceed maximum
  - _Requirements: 4.1, 4.2_

- [ ]* 8.2 Write property test for Retry-After header
  - **Property 6: Retry-After Header Respected**
  - **Validates: Requirements 4.3**
  - Generate 429 responses with Retry-After header
  - Verify retry waits at least specified seconds
  - _Requirements: 4.3_

- [ ]* 8.3 Write property test for retry decision logic
  - **Property 7: Retry Decision Based on Status Code**
  - **Validates: Requirements 4.4, 4.5**
  - Test retry occurs for 429, 5xx, network errors
  - Test no retry for 4xx errors (except 429)
  - _Requirements: 4.4, 4.5_

- [~] 9. Checkpoint - Verify core infrastructure
  - Test URL validation with various invalid inputs
  - Test content sanitization with XSS attempts
  - Test rate limiter with burst requests
  - Test retry handler with simulated failures
  - Ensure all tests pass, ask the user if questions arise

### Phase 3: Architecture Improvements

- [~] 10. Implement site adapter pattern
  - Create `supabase/functions/scrape-novel/adapters/` directory
  - Define `SiteAdapter` interface with extraction methods
  - Create `AdapterRegistry` class for adapter management
  - Implement `DefaultAdapter` for generic novel sites
  - Add URL pattern matching for adapter selection
  - Implement fallback to default adapter when no match
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

- [ ]* 10.1 Write property test for site adapter selection
  - **Property 14: Site Adapter Selection by Domain**
  - **Validates: Requirements 7.4, 7.6**
  - Generate URLs with various domains
  - Verify correct adapter selected or fallback to default
  - _Requirements: 7.4, 7.6_

- [~] 11. Integrate site adapters into scraper service
  - Update `supabase/functions/scrape-novel/index.ts` to use adapter registry
  - Add adapter selection logic based on URL
  - Update novel extraction to use adapter methods
  - Test with multiple novel site URLs
  - _Requirements: 7.4, 7.6_

- [~] 12. Implement cache layer
  - Create `supabase/functions/shared/cache.ts` with `CacheEntry` and `CacheConfig` interfaces
  - Implement `Cache` class with LRU eviction policy
  - Add TTL support (default: 24 hours)
  - Implement cache key generation from URLs
  - Add size limit enforcement (evict LRU when full)
  - Create separate caches for novel info and chapter content
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_

- [ ]* 12.1 Write property test for cache hit prevents API call
  - **Property 15: Cache Hit Prevents API Call**
  - **Validates: Requirements 8.2, 8.3**
  - Test that valid cached content is returned without API call
  - _Requirements: 8.2, 8.3_

- [ ]* 12.2 Write property test for cache miss triggers API call
  - **Property 16: Cache Miss Triggers API Call and Update**
  - **Validates: Requirements 8.4**
  - Test that missing/expired cache triggers API call and cache update
  - _Requirements: 8.4_

- [ ]* 12.3 Write property test for LRU cache eviction
  - **Property 17: LRU Cache Eviction**
  - **Validates: Requirements 8.7**
  - Test that least recently used entry is evicted when cache full
  - _Requirements: 8.7_

- [~] 13. Integrate cache into scraper service
  - Update `supabase/functions/scrape-novel/index.ts` to check cache before API calls
  - Update `supabase/functions/scrape-chapter/index.ts` to use cache
  - Add cache key generation for novel and chapter requests
  - Implement cache update after successful API calls
  - _Requirements: 8.2, 8.3, 8.4_

- [~] 14. Implement batch fetcher utility
  - Create `src/lib/utils/batch-fetcher.ts` with `BatchConfig` and `BatchResult` interfaces
  - Implement `BatchFetcher` class with configurable batch size (default: 3)
  - Process batches sequentially, items within batch in parallel
  - Add progress callback after each item completes
  - Add batch complete callback after each batch
  - Implement cancellation support
  - Collect all failures for final reporting
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

- [ ]* 14.1 Write property test for sequential batch processing
  - **Property 18: Sequential Batch Processing**
  - **Validates: Requirements 9.2**
  - Test that each batch completes before next batch starts
  - _Requirements: 9.2_

- [ ]* 14.2 Write property test for immediate next batch start
  - **Property 19: Immediate Next Batch Start**
  - **Validates: Requirements 9.3**
  - Test that next batch starts immediately after previous completes
  - _Requirements: 9.3_

- [ ]* 14.3 Write property test for batch failure isolation
  - **Property 21: Batch Failure Isolation**
  - **Validates: Requirements 9.5**
  - Test that item failures don't stop other items in batch
  - _Requirements: 9.5_

- [~] 15. Implement storage manager with quota monitoring
  - Create `src/lib/storage-manager.ts` with `StorageQuota` and `StorageManager` interfaces
  - Implement `getQuota` method to calculate storage usage
  - Add 80% usage threshold warning
  - Implement quota exceeded error handling with suggestions
  - Add `calculateNovelSize` method
  - Implement atomic save operations with rollback on failure
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

- [ ]* 15.1 Write property test for storage quota exceeded error
  - **Property 23: Storage Quota Exceeded Error**
  - **Validates: Requirements 10.3**
  - Test that save exceeding quota displays error with space info
  - _Requirements: 10.3_

- [~] 16. Checkpoint - Verify architecture improvements
  - Test site adapter selection with multiple URLs
  - Test cache hit/miss scenarios
  - Test batch fetcher with various batch sizes
  - Test storage quota warnings and errors
  - Ensure all tests pass, ask the user if questions arise

### Phase 4: UI/UX Enhancements

- [~] 17. Implement theme provider and toggle
  - Create `src/contexts/ThemeContext.tsx` with `ThemeContextValue` interface
  - Use next-themes library for theme management
  - Implement system preference detection via media query
  - Add theme persistence to localStorage
  - Create theme toggle button component
  - Add theme toggle to toolbar
  - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6_

- [ ]* 17.1 Write property test for theme toggle
  - **Property 31: Theme Toggle Switches Theme**
  - **Validates: Requirements 13.2**
  - Test that clicking toggle switches between light and dark
  - _Requirements: 13.2_

- [ ]* 17.2 Write property test for theme persistence
  - **Property 32: Theme Preference Persistence**
  - **Validates: Requirements 13.3, 13.4**
  - Test that theme preference persists after reload
  - _Requirements: 13.3, 13.4_

- [~] 18. Implement reader customization context
  - Create `src/contexts/ReaderContext.tsx` with `ReaderSettings` and `ReaderContextValue` interfaces
  - Implement font size control (12-24px range)
  - Implement font family selection (serif, sans-serif, monospace)
  - Add settings persistence to localStorage
  - Apply settings via CSS custom properties
  - Create customization controls component
  - Add reset to defaults button
  - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6_

- [ ]* 18.1 Write property test for font settings persistence
  - **Property 33: Font Settings Application and Persistence**
  - **Validates: Requirements 14.3, 14.4, 14.5**
  - Test that font changes apply immediately and persist after reload
  - _Requirements: 14.3, 14.4, 14.5_

- [ ]* 18.2 Write property test for font settings reset
  - **Property 34: Font Settings Reset**
  - **Validates: Requirements 14.6**
  - Test that reset button restores default values
  - _Requirements: 14.6_

- [~] 19. Implement chapter search and filter
  - Create `src/hooks/useChapterSearch.ts` with `UseChapterSearchResult` interface
  - Implement text-based chapter filtering (case-insensitive)
  - Implement numeric chapter filtering
  - Add search result count display
  - Implement search text highlighting in chapter titles
  - Add search input component to chapter list
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_

- [ ]* 19.1 Write property test for chapter search text filtering
  - **Property 25: Chapter Search Text Filtering**
  - **Validates: Requirements 11.2, 11.4**
  - Test that filtered list contains only matching chapters
  - Verify count matches actual filtered list length
  - _Requirements: 11.2, 11.4_

- [ ]* 19.2 Write property test for search clear restores all
  - **Property 28: Search Clear Restores All Chapters**
  - **Validates: Requirements 11.6**
  - Test that clearing search restores full chapter list
  - _Requirements: 11.6_

- [~] 20. Implement reading progress tracking
  - Create `src/hooks/useReadingProgress.ts` with `UseReadingProgressResult` interface
  - Implement scroll position tracking and saving
  - Implement scroll position restoration on chapter load
  - Add last read chapter tracking to storage manager
  - Implement auto-open last read chapter on novel open
  - Add visual progress indicator for each chapter
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6_

- [ ]* 20.1 Write property test for scroll position persistence
  - **Property 29: Scroll Position Persistence**
  - **Validates: Requirements 12.2, 12.3**
  - Test that scroll position is restored when returning to chapter
  - _Requirements: 12.2, 12.3_

- [ ]* 20.2 Write property test for last read chapter restoration
  - **Property 30: Last Read Chapter Restoration**
  - **Validates: Requirements 12.5**
  - Test that last read chapter is auto-selected on novel open
  - _Requirements: 12.5_

- [~] 21. Implement export progress indicators
  - Update `src/lib/export-service.ts` to emit progress events
  - Create progress modal component
  - Display current chapter being processed and total count
  - Calculate and display percentage completion
  - Add completion message display
  - Implement export cancellation support
  - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6_

- [ ]* 21.1 Write property test for export progress accuracy
  - **Property 35: Export Progress Accuracy**
  - **Validates: Requirements 15.2, 15.3, 15.4**
  - Test that progress accurately reflects current chapter and percentage
  - _Requirements: 15.2, 15.3, 15.4_

- [~] 22. Implement fetch all progress indicator
  - Create `src/hooks/useChapterFetcher.ts` with `UseChapterFetcherResult` interface
  - Integrate batch fetcher with rate limiter and retry handler
  - Display progress bar with chapter count and percentage
  - Show currently fetching chapter title
  - Implement cancellation support
  - Save successfully fetched chapters on cancellation
  - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6_

- [ ]* 22.1 Write property test for fetch all progress accuracy
  - **Property 38: Fetch All Progress Accuracy**
  - **Validates: Requirements 16.2, 16.3, 16.4**
  - Test that progress bar shows accurate counts and percentage
  - _Requirements: 16.2, 16.3, 16.4_

- [ ]* 22.2 Write property test for fetch all cancellation
  - **Property 39: Fetch All Cancellation Preserves Fetched Chapters**
  - **Validates: Requirements 16.5, 16.6**
  - Test that cancelled fetch saves all completed chapters
  - _Requirements: 16.5, 16.6_

- [~] 23. Checkpoint - Verify UI/UX enhancements
  - Test theme toggle and persistence
  - Test font customization and persistence
  - Test chapter search with various queries
  - Test reading progress tracking
  - Test export progress indicators
  - Test fetch all progress and cancellation
  - Ensure all tests pass, ask the user if questions arise

### Phase 5: Component Refactoring

- [~] 24. Extract chapter navigation hook
  - Create `src/hooks/useChapterNavigation.ts` with `UseChapterNavigationResult` interface
  - Extract chapter selection logic from Reader component
  - Implement next/previous chapter navigation
  - Add keyboard shortcut support (arrow keys)
  - Add hasNext/hasPrev boolean flags
  - _Requirements: 17.2_

- [~] 25. Refactor Reader component into smaller components
  - Create `src/components/reader/ReaderPage.tsx` as orchestrator
  - Create `src/components/reader/ReaderToolbar.tsx` for toolbar actions
  - Create `src/components/reader/ReaderContent.tsx` for chapter display
  - Update `src/components/reader/ChapterList.tsx` with search integration
  - Ensure each component has single responsibility
  - Define clear prop interfaces for all components
  - _Requirements: 17.1, 17.4, 17.5_

- [~] 26. Extract fetch operations into custom hook
  - Move fetch logic from components to `useChapterFetcher` hook
  - Integrate rate limiter, retry handler, and batch fetcher
  - Add validation and sanitization to fetch pipeline
  - Update components to use new hook
  - _Requirements: 17.3_

- [~] 27. Verify refactored components maintain functionality
  - Test all reader functionality after refactoring
  - Verify no regressions in chapter navigation
  - Verify fetch operations work correctly
  - Ensure UI updates properly
  - _Requirements: 17.6_

- [~] 28. Checkpoint - Verify component refactoring
  - Test all reader features end-to-end
  - Verify component isolation and reusability
  - Ensure all tests pass, ask the user if questions arise

### Phase 6: TypeScript Strict Mode

- [~] 29. Enable TypeScript strict mode
  - Update `tsconfig.json` to set `"strict": true`
  - Run `tsc --noEmit` to identify all type errors
  - Create list of files with type errors
  - _Requirements: 18.1_

- [~] 30. Fix type errors in utility files
  - Add explicit return types to all functions in `src/lib/`
  - Replace `any` types with proper types
  - Add type guards for null/undefined handling
  - Fix errors in validation.ts, storage-manager.ts, rate-limiter.ts, retry-handler.ts
  - _Requirements: 18.2, 18.3, 18.4, 18.5, 18.6_

- [~] 31. Fix type errors in components
  - Add explicit types to all component props
  - Add return types to component functions
  - Fix null/undefined handling in components
  - Update ErrorBoundary, ReaderPage, ReaderContent, ChapterList
  - _Requirements: 18.2, 18.3, 18.4, 18.5, 18.6_

- [~] 32. Fix type errors in hooks
  - Add explicit return types to all custom hooks
  - Fix parameter types in hooks
  - Handle null/undefined cases explicitly
  - Update useChapterFetcher, useChapterNavigation, useReadingProgress, useChapterSearch
  - _Requirements: 18.2, 18.3, 18.4, 18.5, 18.6_

- [~] 33. Fix type errors in Supabase functions
  - Add types to scraper service functions
  - Add types to adapter interfaces and implementations
  - Add types to cache and sanitization utilities
  - Ensure no `any` types remain
  - _Requirements: 18.2, 18.3, 18.4, 18.5, 18.6_

- [~] 34. Verify TypeScript strict mode compliance
  - Run `tsc --noEmit` and verify no errors
  - Run all tests to ensure no runtime issues
  - Review code for any remaining type issues
  - _Requirements: 18.1, 18.2_

- [~] 35. Checkpoint - Verify TypeScript strict mode
  - Confirm zero TypeScript errors
  - Ensure all tests pass
  - Ask the user if questions arise

### Phase 7: Testing and Error Handling

- [~] 36. Improve error messages throughout application
  - Update all error messages to be user-friendly (no technical jargon)
  - Add actionable suggestions to error messages
  - Implement network error detection with connection check suggestion
  - Add API error message passthrough
  - Implement validation error highlighting and feedback
  - Ensure detailed error logging to console
  - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5, 19.6_

- [ ]* 36.1 Write property test for network error suggestions
  - **Property 40: Network Error Suggests Connection Check**
  - **Validates: Requirements 19.2**
  - Test that network errors include connection check suggestion
  - _Requirements: 19.2_

- [ ]* 36.2 Write property test for validation error feedback
  - **Property 42: Validation Error Feedback**
  - **Validates: Requirements 19.4**
  - Test that validation errors highlight field and show explanation
  - _Requirements: 19.4_

- [~] 37. Write unit tests for storage manager
  - Create `src/lib/storage-manager.test.ts`
  - Test save and retrieve novel operations
  - Test quota calculation accuracy
  - Test quota exceeded error handling
  - Test reading progress save and restore
  - Achieve 80% code coverage
  - _Requirements: 20.1_

- [~] 38. Write unit tests for scraper service
  - Create `supabase/functions/scrape-novel/index.test.ts`
  - Test adapter selection logic
  - Test cache integration
  - Test content sanitization integration
  - Test error handling
  - Achieve 80% code coverage
  - _Requirements: 20.2_

- [~] 39. Write unit tests for validation logic
  - Create `src/lib/validation.test.ts`
  - Test all validation rules (protocol, length, domain, malicious patterns)
  - Test URL sanitization
  - Test edge cases (empty string, null, undefined)
  - Achieve 100% code coverage
  - _Requirements: 20.3_

- [~] 40. Write unit tests for sanitization logic
  - Create `supabase/functions/shared/sanitization.test.ts`
  - Test script tag removal
  - Test event handler removal
  - Test iframe removal
  - Test safe element preservation
  - Achieve 100% code coverage
  - _Requirements: 20.4_

- [~] 41. Write unit tests for rate limiter
  - Create `src/lib/utils/rate-limiter.test.ts`
  - Test minimum delay enforcement
  - Test concurrent request limit
  - Test queue management
  - Achieve 80% code coverage
  - _Requirements: 20.1_

- [~] 42. Write unit tests for retry handler
  - Create `src/lib/utils/retry-handler.test.ts`
  - Test exponential backoff timing
  - Test retry decision logic for different status codes
  - Test Retry-After header handling
  - Test max attempts enforcement
  - Achieve 80% code coverage
  - _Requirements: 20.1_

- [~] 43. Write integration test for chapter fetching workflow
  - Create `src/__tests__/integration/chapter-fetching.test.ts`
  - Test end-to-end chapter fetch with rate limiting and retry
  - Test batch fetching with progress updates
  - Test error handling and partial success
  - Test cancellation preserves fetched chapters
  - _Requirements: 20.5_

- [~] 44. Write integration test for export workflow
  - Create `src/__tests__/integration/export.test.ts`
  - Test PDF export with progress tracking
  - Test DOCX export with progress tracking
  - Test export cancellation
  - Test large novel export
  - _Requirements: 20.6_

- [~] 45. Configure continuous integration
  - Create `.github/workflows/test.yml`
  - Add linting step
  - Add type checking step
  - Add unit test step
  - Add integration test step
  - Add coverage reporting
  - Configure to run on every commit
  - _Requirements: 20.7_

- [~] 46. Final checkpoint - Comprehensive testing
  - Run full test suite and verify all tests pass
  - Check code coverage meets targets (80% overall, 100% for validation/sanitization)
  - Manually test critical user workflows
  - Verify error handling works correctly
  - Ensure all tests pass, ask the user if questions arise

## Notes

- Tasks marked with `*` are optional property-based tests and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- Integration tests validate end-to-end workflows
- TypeScript is used throughout (React 18, TypeScript, Vite, TailwindCSS, shadcn/ui)
- All code should follow accessibility best practices (WCAG AA compliance)
- Security is prioritized: input validation, output sanitization, CSP headers
- Performance considerations: debouncing, memoization, lazy loading where appropriate
