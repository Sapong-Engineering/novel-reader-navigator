# Requirements Document

## Introduction

This document specifies requirements for improving the Novel Reader web application. The Novel Reader is a React-based application that allows users to scrape web novels from URLs, read chapters offline, and export content to PDF/DOCX formats. The improvements address critical bugs, architectural weaknesses, user experience gaps, and code quality issues that impact reliability, performance, and maintainability.

## Glossary

- **Novel_Reader**: The web application system that manages novel scraping, storage, and reading
- **Scraper_Service**: The Supabase Edge Function that interfaces with Firecrawl API to extract novel content
- **Chapter_Fetcher**: The component responsible for retrieving individual chapter content
- **Storage_Manager**: The localStorage-based persistence layer for novels and chapters
- **Reader_Component**: The UI component that displays chapter content to users
- **Export_Service**: The service that converts saved chapters to PDF or DOCX format
- **Firecrawl_API**: The external API service used for web scraping
- **Chapter**: A single unit of novel content with title, URL, and optional content
- **Novel**: A collection of chapters with metadata (title, description, cover)
- **Library**: The user's collection of saved novels

## Requirements

### Requirement 1: Fix Regex Escape Bug in Chapter URL Extraction

**User Story:** As a developer, I want the chapter URL extraction regex to work correctly, so that novels can be scraped without errors

#### Acceptance Criteria

1. THE Scraper_Service SHALL replace the corrupted placeholder `\\e8eb5b7c-fb50-4e8c-aed3-76083bc805c8` with the correct escape sequence `\\$&` in the regex pattern
2. WHEN a novel URL is provided, THE Scraper_Service SHALL correctly escape special regex characters in the base URL
3. WHEN extracting chapter URLs, THE Scraper_Service SHALL match chapter patterns without regex syntax errors
4. THE Scraper_Service SHALL successfully extract chapter numbers from URLs containing special characters

### Requirement 2: Implement React Error Boundaries

**User Story:** As a user, I want the application to handle component errors gracefully, so that one error doesn't crash the entire app

#### Acceptance Criteria

1. THE Novel_Reader SHALL implement an error boundary component that catches React component errors
2. WHEN a component throws an error, THE error boundary SHALL display a fallback UI with error details
3. WHEN a component throws an error, THE error boundary SHALL log the error to the console
4. THE Novel_Reader SHALL wrap the Reader_Component with an error boundary
5. THE Novel_Reader SHALL wrap the chapter list component with an error boundary
6. WHEN an error occurs in a wrapped component, THE error boundary SHALL allow other parts of the application to continue functioning

### Requirement 3: Implement Rate Limiting for Batch Operations

**User Story:** As a user, I want the "Fetch All" operation to respect API rate limits, so that my requests don't get blocked

#### Acceptance Criteria

1. THE Chapter_Fetcher SHALL implement configurable rate limiting with a default of 2 requests per second
2. WHEN fetching multiple chapters, THE Chapter_Fetcher SHALL enforce a minimum delay between consecutive requests
3. THE Chapter_Fetcher SHALL allow configuration of concurrent request limits with a default of 3 concurrent requests
4. WHEN rate limit is exceeded, THE Chapter_Fetcher SHALL queue requests for later execution
5. THE Chapter_Fetcher SHALL expose rate limit configuration through environment variables or settings

### Requirement 4: Implement Retry Logic for Failed Requests

**User Story:** As a user, I want failed chapter fetches to retry automatically, so that temporary network issues don't require manual intervention

#### Acceptance Criteria

1. THE Chapter_Fetcher SHALL implement exponential backoff retry logic with a maximum of 3 retry attempts
2. WHEN a chapter fetch fails with a network error, THE Chapter_Fetcher SHALL retry the request after an exponentially increasing delay
3. WHEN a chapter fetch fails with a 429 status code, THE Chapter_Fetcher SHALL retry after the delay specified in the Retry-After header
4. WHEN a chapter fetch fails with a 5xx status code, THE Chapter_Fetcher SHALL retry the request
5. WHEN a chapter fetch fails with a 4xx status code other than 429, THE Chapter_Fetcher SHALL not retry the request
6. WHEN all retry attempts are exhausted, THE Chapter_Fetcher SHALL report the failure to the user
7. THE Chapter_Fetcher SHALL log retry attempts with timestamps and error details

### Requirement 5: Implement URL Validation and Sanitization

**User Story:** As a user, I want invalid URLs to be rejected with clear error messages, so that I understand what went wrong

#### Acceptance Criteria

1. THE Novel_Reader SHALL validate that input URLs use HTTP or HTTPS protocols
2. THE Novel_Reader SHALL validate that input URLs contain a valid domain name
3. WHEN an invalid URL is provided, THE Novel_Reader SHALL display a descriptive error message
4. THE Scraper_Service SHALL sanitize URLs by trimming whitespace and normalizing protocol prefixes
5. THE Scraper_Service SHALL reject URLs containing potentially malicious patterns
6. THE Novel_Reader SHALL validate URL length does not exceed 2048 characters

### Requirement 6: Implement Content Sanitization for Scraped Data

**User Story:** As a user, I want scraped content to be safe from XSS attacks, so that malicious scripts cannot execute in my browser

#### Acceptance Criteria

1. THE Scraper_Service SHALL sanitize HTML content by removing script tags before storage
2. THE Scraper_Service SHALL sanitize HTML content by removing event handler attributes before storage
3. THE Scraper_Service SHALL sanitize HTML content by removing potentially dangerous iframe elements before storage
4. THE Reader_Component SHALL render markdown content safely without executing embedded scripts
5. THE Scraper_Service SHALL preserve safe formatting elements like headings, paragraphs, and emphasis
6. THE Scraper_Service SHALL validate that sanitized content maintains readability

### Requirement 7: Decouple Scraping Logic from Site Structure

**User Story:** As a developer, I want the scraper to work with multiple novel sites, so that users can read from different sources

#### Acceptance Criteria

1. THE Scraper_Service SHALL implement a site adapter pattern that separates site-specific logic from core scraping
2. THE Scraper_Service SHALL provide a default adapter that works with generic novel sites
3. THE Scraper_Service SHALL allow registration of site-specific adapters based on URL patterns
4. WHEN scraping a novel, THE Scraper_Service SHALL select the appropriate adapter based on the URL domain
5. THE site adapter SHALL define methods for extracting title, description, cover URL, and chapter list
6. THE Scraper_Service SHALL fall back to the default adapter when no site-specific adapter matches

### Requirement 8: Implement Caching for Firecrawl API Responses

**User Story:** As a user, I want repeated requests for the same content to be served from cache, so that I save API costs and improve performance

#### Acceptance Criteria

1. THE Scraper_Service SHALL implement a cache layer for Firecrawl API responses with a default TTL of 24 hours
2. WHEN a novel or chapter is requested, THE Scraper_Service SHALL check the cache before making an API call
3. WHEN cached content exists and is not expired, THE Scraper_Service SHALL return the cached content
4. WHEN cached content is expired or missing, THE Scraper_Service SHALL fetch from the API and update the cache
5. THE Scraper_Service SHALL store cache entries with timestamps and URL keys
6. THE Scraper_Service SHALL implement cache size limits to prevent unbounded growth
7. WHEN cache size limit is reached, THE Scraper_Service SHALL evict the least recently used entries

### Requirement 9: Implement Batch Fetching for Chapters

**User Story:** As a user, I want chapters to be fetched in parallel batches, so that "Fetch All" completes faster

#### Acceptance Criteria

1. THE Chapter_Fetcher SHALL fetch chapters in parallel batches with a default batch size of 3
2. WHEN fetching multiple chapters, THE Chapter_Fetcher SHALL process batches sequentially
3. WHEN a batch completes, THE Chapter_Fetcher SHALL immediately start the next batch
4. THE Chapter_Fetcher SHALL update progress indicators after each batch completes
5. WHEN a chapter in a batch fails, THE Chapter_Fetcher SHALL continue processing other chapters in the batch
6. THE Chapter_Fetcher SHALL collect and report all failures after all batches complete

### Requirement 10: Handle localStorage Quota Limits

**User Story:** As a user, I want to be warned when storage is nearly full, so that I can manage my library before hitting limits

#### Acceptance Criteria

1. THE Storage_Manager SHALL monitor localStorage usage and calculate available space
2. WHEN storage usage exceeds 80% of the quota, THE Storage_Manager SHALL display a warning to the user
3. WHEN a save operation would exceed the storage quota, THE Storage_Manager SHALL display an error message with available space information
4. THE Storage_Manager SHALL provide a method to calculate the size of stored novels
5. THE Storage_Manager SHALL allow users to view storage usage statistics
6. WHEN storage quota is exceeded, THE Storage_Manager SHALL suggest deleting old novels or chapters

### Requirement 11: Implement Chapter Search and Filter

**User Story:** As a user, I want to search and filter chapters by title or number, so that I can quickly find specific chapters in long novels

#### Acceptance Criteria

1. THE Reader_Component SHALL provide a search input field above the chapter list
2. WHEN a user types in the search field, THE Reader_Component SHALL filter chapters whose titles contain the search text
3. THE Reader_Component SHALL support filtering by chapter number using numeric input
4. THE Reader_Component SHALL display the count of filtered chapters
5. THE Reader_Component SHALL highlight matching text in filtered chapter titles
6. WHEN the search field is cleared, THE Reader_Component SHALL display all chapters

### Requirement 12: Implement Reading Progress Tracking

**User Story:** As a user, I want my reading position to be saved automatically, so that I can resume where I left off

#### Acceptance Criteria

1. THE Reader_Component SHALL track the user's scroll position within each chapter
2. WHEN a user scrolls within a chapter, THE Reader_Component SHALL save the scroll position to localStorage
3. WHEN a user returns to a previously read chapter, THE Reader_Component SHALL restore the saved scroll position
4. THE Storage_Manager SHALL track the last read chapter for each novel
5. WHEN a user opens a novel, THE Reader_Component SHALL automatically open the last read chapter
6. THE Reader_Component SHALL display a visual indicator showing reading progress percentage for each chapter

### Requirement 13: Implement Theme Toggle

**User Story:** As a user, I want to switch between dark and light themes, so that I can read comfortably in different lighting conditions

#### Acceptance Criteria

1. THE Novel_Reader SHALL provide a theme toggle button in the toolbar
2. WHEN the theme toggle is clicked, THE Novel_Reader SHALL switch between light and dark themes
3. THE Novel_Reader SHALL persist the theme preference to localStorage
4. WHEN the application loads, THE Novel_Reader SHALL apply the saved theme preference
5. THE Novel_Reader SHALL default to the system theme preference when no saved preference exists
6. THE theme toggle SHALL display an appropriate icon for the current theme

### Requirement 14: Implement Reader Customization

**User Story:** As a user, I want to customize font size and family, so that I can read comfortably according to my preferences

#### Acceptance Criteria

1. THE Reader_Component SHALL provide controls for adjusting font size with a range of 12px to 24px
2. THE Reader_Component SHALL provide a dropdown for selecting font family from at least 3 options
3. WHEN font settings are changed, THE Reader_Component SHALL apply changes immediately to the displayed content
4. THE Reader_Component SHALL persist font preferences to localStorage
5. WHEN the application loads, THE Reader_Component SHALL apply saved font preferences
6. THE Reader_Component SHALL provide a reset button to restore default font settings

### Requirement 15: Implement Export Progress Indicators

**User Story:** As a user, I want to see progress when exporting large novels, so that I know the operation is working

#### Acceptance Criteria

1. THE Export_Service SHALL display a progress modal when export operations begin
2. WHEN exporting to PDF, THE Export_Service SHALL update progress as each chapter is processed
3. WHEN exporting to DOCX, THE Export_Service SHALL update progress as each chapter is processed
4. THE Export_Service SHALL display the current chapter being processed and total chapter count
5. THE Export_Service SHALL display a completion message when export finishes
6. THE Export_Service SHALL allow users to cancel in-progress export operations

### Requirement 16: Implement Fetch All Progress Indicator

**User Story:** As a user, I want to see detailed progress during "Fetch All" operations, so that I know how many chapters remain

#### Acceptance Criteria

1. THE Reader_Component SHALL display a progress bar during "Fetch All" operations
2. THE progress bar SHALL show the number of chapters fetched and total chapters
3. THE progress bar SHALL show the percentage of completion
4. THE Reader_Component SHALL display the title of the chapter currently being fetched
5. THE Reader_Component SHALL allow users to cancel "Fetch All" operations in progress
6. WHEN "Fetch All" is cancelled, THE Reader_Component SHALL save all chapters fetched before cancellation

### Requirement 17: Refactor Large Components

**User Story:** As a developer, I want large components split into smaller, focused components, so that the code is easier to maintain and test

#### Acceptance Criteria

1. THE Reader_Component SHALL be split into separate components for toolbar, chapter list, and content display
2. THE Reader_Component SHALL extract chapter navigation logic into a custom hook
3. THE Reader_Component SHALL extract fetch operations into a custom hook
4. THE Novel_Reader SHALL ensure each component has a single, well-defined responsibility
5. THE Novel_Reader SHALL ensure extracted components have clear prop interfaces
6. THE Novel_Reader SHALL maintain existing functionality after refactoring

### Requirement 18: Enable TypeScript Strict Mode

**User Story:** As a developer, I want TypeScript strict mode enabled, so that type errors are caught at compile time

#### Acceptance Criteria

1. THE Novel_Reader SHALL enable strict mode in tsconfig.json
2. THE Novel_Reader SHALL fix all type errors that appear when strict mode is enabled
3. THE Novel_Reader SHALL ensure all function parameters have explicit types
4. THE Novel_Reader SHALL ensure all function return types are explicitly declared
5. THE Novel_Reader SHALL eliminate all uses of the any type
6. THE Novel_Reader SHALL ensure null and undefined are handled explicitly

### Requirement 19: Improve Error Handling

**User Story:** As a user, I want clear, actionable error messages, so that I understand what went wrong and how to fix it

#### Acceptance Criteria

1. THE Novel_Reader SHALL display user-friendly error messages that avoid technical jargon
2. WHEN a network error occurs, THE Novel_Reader SHALL suggest checking internet connection
3. WHEN an API error occurs, THE Novel_Reader SHALL display the specific error message from the API
4. WHEN a validation error occurs, THE Novel_Reader SHALL highlight the invalid input and explain the requirement
5. THE Novel_Reader SHALL log detailed error information to the console for debugging
6. THE Novel_Reader SHALL provide actionable suggestions in error messages when possible

### Requirement 20: Implement Test Coverage

**User Story:** As a developer, I want comprehensive test coverage, so that regressions are caught before deployment

#### Acceptance Criteria

1. THE Novel_Reader SHALL implement unit tests for the Storage_Manager with at least 80% code coverage
2. THE Novel_Reader SHALL implement unit tests for the Scraper_Service with at least 80% code coverage
3. THE Novel_Reader SHALL implement unit tests for URL validation logic with 100% code coverage
4. THE Novel_Reader SHALL implement unit tests for content sanitization logic with 100% code coverage
5. THE Novel_Reader SHALL implement integration tests for the chapter fetching workflow
6. THE Novel_Reader SHALL implement integration tests for the export workflow
7. THE Novel_Reader SHALL configure continuous integration to run tests on every commit