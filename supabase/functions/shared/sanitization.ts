// HTML and Markdown content sanitization utilities

const DANGEROUS_TAGS = /<(script|iframe|object|embed|form|input|button|link|meta|style)[^>]*>[\s\S]*?<\/\1>/gi;
const SELF_CLOSING_DANGEROUS = /<(script|iframe|object|embed|form|input|link|meta|style)[^>]*\/?>/gi;
const EVENT_HANDLERS = /\s+on\w+\s*=\s*["'][^"']*["']/gi;
const EVENT_HANDLERS_NO_QUOTES = /\s+on\w+\s*=\s*[^\s>]*/gi;
const JAVASCRIPT_HREF = /href\s*=\s*["']?\s*javascript:[^"'\s>]*/gi;
const DATA_HREF = /href\s*=\s*["']?\s*data:[^"'\s>]*/gi;

/**
 * Sanitize HTML by removing dangerous elements and attributes.
 * Preserves safe formatting elements (headings, paragraphs, emphasis, lists, links).
 */
export function sanitizeHtml(html: string): string {
  let result = html;

  // Remove dangerous tags with content
  result = result.replace(DANGEROUS_TAGS, '');

  // Remove self-closing dangerous tags
  result = result.replace(SELF_CLOSING_DANGEROUS, '');

  // Remove event handler attributes
  result = result.replace(EVENT_HANDLERS, '');
  result = result.replace(EVENT_HANDLERS_NO_QUOTES, '');

  // Remove javascript: and data: hrefs
  result = result.replace(JAVASCRIPT_HREF, 'href="#"');
  result = result.replace(DATA_HREF, 'href="#"');

  return result;
}

const MARKDOWN_SCRIPT_TAGS = /<script[\s\S]*?<\/script>/gi;
const MARKDOWN_JAVASCRIPT_LINKS = /\[([^\]]*)\]\(javascript:[^)]*\)/gi;
const MARKDOWN_DATA_LINKS = /\[([^\]]*)\]\(data:[^)]*\)/gi;
const MARKDOWN_HTML_EVENTS = /\s+on\w+\s*=\s*["'][^"']*["']/gi;

/**
 * Sanitize Markdown content to prevent script execution.
 */
export function sanitizeMarkdown(markdown: string): string {
  let result = markdown;

  // Remove embedded script tags
  result = result.replace(MARKDOWN_SCRIPT_TAGS, '');

  // Replace javascript: links with safe placeholder
  result = result.replace(MARKDOWN_JAVASCRIPT_LINKS, '[$1](#)');

  // Replace data: links with safe placeholder
  result = result.replace(MARKDOWN_DATA_LINKS, '[$1](#)');

  // Remove HTML event handlers inline in markdown
  result = result.replace(MARKDOWN_HTML_EVENTS, '');

  return result;
}
