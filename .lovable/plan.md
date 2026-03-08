

## QA Audit Report — Novel Reader PWA

Assessed against: WCAG 2.1 (AA), OWASP Top 10, PWA Checklist, GDPR/Privacy best practices, and general UX/reliability standards.

---

### CRITICAL Issues

#### 1. XSS via `dangerouslySetInnerHTML` in ChapterList (OWASP A03: Injection)
- **File:** `src/components/ChapterList.tsx` line 123
- **Problem:** `highlightMatch(chapter.title)` output is rendered via `dangerouslySetInnerHTML`. If a novel's chapter title contains malicious HTML (e.g. `<img onerror=...>`), it executes in the user's browser.
- **Fix:** Use a React-based highlight approach (split string, wrap match in `<mark>`) instead of injecting raw HTML.

#### 2. No delete confirmation dialog (UX / Data Loss Prevention)
- **File:** `src/pages/Index.tsx` line 92, `src/components/NovelCard.tsx` line 57
- **Problem:** `handleDeleteNovel` immediately deletes without confirmation. Accidental taps (especially on mobile) permanently remove data.
- **Fix:** Add an `AlertDialog` confirmation before deletion.

#### 3. No CSRF / rate-limiting on auth forms (OWASP A07: Auth Failures)
- **File:** `src/pages/Auth.tsx`
- **Problem:** No rate limiting on login/signup submissions. Attackers can brute-force credentials. No CAPTCHA or lockout mechanism.
- **Fix:** Add client-side rate limiting (disable button after N attempts) and consider server-side rate limits.

---

### HIGH Issues

#### 4. Missing keyboard navigation & focus management (WCAG 2.1.1, 2.4.3)
- **Problem:** Chapter list items are `<button>` (good), but the reader view has no skip-to-content link, no focus trap management when drawers open, and no visible focus indicators on many interactive elements.
- **Fix:** Add skip-to-content link, ensure all interactive elements have `focus-visible` outlines, manage focus when modals/drawers open.

#### 5. No `aria-label` or `aria-live` regions (WCAG 4.1.2, 4.1.3)
- **Problem:** The sync indicator, progress bar, loading states, and error banner lack ARIA attributes. Screen readers won't announce sync status changes, chapter loading, or errors.
- **Fix:** Add `aria-live="polite"` to `SyncIndicator` and `SyncErrorBanner`, `aria-label` to icon-only buttons (some have `title` but not `aria-label`), `role="progressbar"` with `aria-valuenow` to the reading progress bar.

#### 6. Scraped content rendered without sanitization (OWASP A03)
- **File:** `src/components/ReaderView.tsx` line 144
- **Problem:** Chapter content is split by `\n\n` and rendered as text paragraphs (safe), but the content from Firecrawl is markdown that could contain HTML. Currently rendered as plain text, which is safe but means formatting is lost. However, if markdown rendering is ever added, this becomes an XSS vector.
- **Note:** The shared `sanitization.ts` exists but is not imported in the frontend reader. Low risk currently since content is rendered as text nodes, but should be documented.

#### 7. localStorage quota not handled (Reliability)
- **File:** `src/lib/novel-store.ts` line 40
- **Problem:** `localStorage.setItem` can throw `QuotaExceededError` when storing many novels with chapter content. No try/catch, no user notification.
- **Fix:** Wrap in try/catch, show toast warning when storage is near capacity, suggest fetching content on-demand.

---

### MEDIUM Issues

#### 8. No password strength requirements beyond length (OWASP A07)
- **File:** `src/pages/Auth.tsx` line 33
- **Problem:** Only checks `password.length < 6`. No uppercase, number, or special character requirements.
- **Fix:** Add zod validation with complexity rules and show strength indicator.

#### 9. Missing `<label>` associations and form semantics (WCAG 1.3.1)
- **File:** `src/components/NovelUrlInput.tsx`
- **Problem:** The URL input likely lacks a visible or associated label. Auth form has labels (good), but the main URL input on the homepage may not.
- **Fix:** Add `aria-label` or visible `<Label>` to the URL input.

#### 10. No color contrast verification for custom theme colors (WCAG 1.4.3)
- **Problem:** The app uses custom CSS variables for reader themes. Depending on user-selected font family and the `bg-reader` background, contrast ratios may not meet the 4.5:1 minimum.
- **Fix:** Audit all theme color combinations and enforce minimum contrast in the theme system.

#### 11. Missing `lang` attribute updates for non-English content (WCAG 3.1.2)
- **Problem:** `<html lang="en">` is hardcoded. Novels may be in any language. Screen readers will mispronounce content.
- **Fix:** Detect novel language or allow user to set it; update `lang` attribute on the reader content container.

#### 12. No privacy policy or data handling disclosure (GDPR Art. 13)
- **Problem:** The app collects email, reading history, bookmarks, and browsing URLs. No privacy policy, no data export, no account deletion option.
- **Fix:** Add a privacy policy page, account deletion flow, and data export option.

#### 13. PWA offline experience incomplete
- **Problem:** The service worker caches app shell and fonts, but not novel content or API responses. Opening the app offline shows the shell but can't load novels from the backend (only localStorage). No offline indicator on the main page.
- **Fix:** Cache API responses for novel metadata. The offline queue handles writes; reads should fall back gracefully with clear UI messaging.

---

### LOW Issues

#### 14. `generateId()` uses `Math.random()` (Weak Identifiers)
- **File:** `src/lib/novel-store.ts` line 53
- **Problem:** `Math.random().toString(36).substring(2, 10)` produces only ~41 bits of entropy with no collision detection.
- **Fix:** Use `crypto.randomUUID()` for stronger, standardized IDs.

#### 15. No `<meta>` CSP headers (OWASP A05: Security Misconfiguration)
- **Problem:** No Content Security Policy configured. Scripts from any origin could be injected.
- **Fix:** Add CSP meta tag or configure server headers to restrict script/style sources.

#### 16. Delete button only visible on hover (Mobile UX)
- **File:** `src/components/NovelCard.tsx` line 54
- **Problem:** `opacity-0 group-hover:opacity-100` — delete button is invisible on touch devices that don't support hover.
- **Fix:** Show delete button on focus or via a long-press/context menu on mobile.

#### 17. No error boundary on Index page
- **Problem:** Reader has `ErrorBoundary` around `ChapterList` and `ReaderView`, but `Index` page has none. A crash in the library view shows a white screen.
- **Fix:** Wrap `Index` content in an `ErrorBoundary`.

---

### Summary Table

| # | Category | Severity | Standard |
|---|----------|----------|----------|
| 1 | XSS in search highlight | Critical | OWASP A03 |
| 2 | No delete confirmation | Critical | UX Safety |
| 3 | No auth rate limiting | Critical | OWASP A07 |
| 4 | Keyboard navigation gaps | High | WCAG 2.1.1 |
| 5 | Missing ARIA attributes | High | WCAG 4.1.2 |
| 6 | Unsanitized scraped content | High | OWASP A03 |
| 7 | localStorage quota unhandled | High | Reliability |
| 8 | Weak password policy | Medium | OWASP A07 |
| 9 | Missing form labels | Medium | WCAG 1.3.1 |
| 10 | Color contrast unverified | Medium | WCAG 1.4.3 |
| 11 | Hardcoded lang attribute | Medium | WCAG 3.1.2 |
| 12 | No privacy policy | Medium | GDPR Art.13 |
| 13 | Incomplete offline UX | Medium | PWA Checklist |
| 14 | Weak ID generation | Low | Security |
| 15 | No CSP headers | Low | OWASP A05 |
| 16 | Hover-only delete button | Low | Mobile UX |
| 17 | Missing error boundary | Low | Reliability |

