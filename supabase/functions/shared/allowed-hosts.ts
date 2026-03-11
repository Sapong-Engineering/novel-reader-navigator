/**
 * Shared allowlist of hostnames permitted for scraping.
 * Single source of truth — used by scrape-novel, scrape-chapter, and search-novels.
 */
export const ALLOWED_HOSTS = new Set([
  'wuxia.click',
  'www.wuxia.click',
  'novelbin.com',
  'www.novelbin.com',
  'empirenovel.com',
  'www.empirenovel.com',
  'gutenberg.org',
  'www.gutenberg.org',
]);

/**
 * Check if a URL's hostname is in the allowlist.
 * Returns { allowed: true } or { allowed: false, hostname } for error messaging.
 */
export function isHostAllowed(url: string): { allowed: boolean; hostname?: string } {
  try {
    const { hostname } = new URL(url);
    return { allowed: ALLOWED_HOSTS.has(hostname), hostname };
  } catch {
    return { allowed: false };
  }
}
