import { describe, it, expect } from 'vitest';

// Re-implement sanitization for browser test (mirrors supabase/functions/shared/sanitization.ts)
function sanitizeHtml(html: string): string {
  let result = html;
  result = result.replace(/<(script|iframe|object|embed|form|input|button|link|meta|style)[^>]*>[\s\S]*?<\/\1>/gi, '');
  result = result.replace(/<(script|iframe|object|embed|form|input|link|meta|style)[^>]*\/?>/gi, '');
  result = result.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '');
  result = result.replace(/\s+on\w+\s*=\s*[^\s>]*/gi, '');
  result = result.replace(/href\s*=\s*["']?\s*javascript:[^"'\s>]*/gi, 'href="#"');
  result = result.replace(/href\s*=\s*["']?\s*data:[^"'\s>]*/gi, 'href="#"');
  return result;
}

function sanitizeMarkdown(markdown: string): string {
  let result = markdown;
  result = result.replace(/<script[\s\S]*?<\/script>/gi, '');
  result = result.replace(/\[([^\]]*)\]\(javascript:[^)]*\)/gi, '[$1](#)');
  result = result.replace(/\[([^\]]*)\]\(data:[^)]*\)/gi, '[$1](#)');
  result = result.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '');
  return result;
}

describe('sanitizeHtml', () => {
  it('removes script tags with content', () => {
    const input = '<p>Hello</p><script>alert("xss")</script>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain('<script');
    expect(result).not.toContain('alert');
    expect(result).toContain('<p>Hello</p>');
  });

  it('removes iframe elements', () => {
    const input = '<p>Text</p><iframe src="evil.com"></iframe>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain('<iframe');
    expect(result).toContain('<p>Text</p>');
  });

  it('removes onclick event handlers', () => {
    const input = '<button onclick="evil()">Click</button>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain('onclick');
  });

  it('removes onerror event handlers', () => {
    const input = '<img src="x" onerror="alert(1)">';
    const result = sanitizeHtml(input);
    expect(result).not.toContain('onerror');
  });

  it('replaces javascript: href with safe placeholder', () => {
    const input = '<a href="javascript:alert(1)">link</a>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain('javascript:');
    expect(result).toContain('href="#"');
  });

  it('replaces data: href with safe placeholder', () => {
    const input = '<a href="data:text/html,<h1>xss</h1>">link</a>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain('data:text/html');
    expect(result).toContain('href="#"');
  });

  it('preserves safe HTML elements', () => {
    const input = '<h1>Title</h1><p>Paragraph</p><em>emphasis</em><ul><li>item</li></ul>';
    const result = sanitizeHtml(input);
    expect(result).toContain('<h1>Title</h1>');
    expect(result).toContain('<p>Paragraph</p>');
    expect(result).toContain('<em>emphasis</em>');
  });
});

describe('sanitizeMarkdown', () => {
  it('removes embedded script tags', () => {
    const input = '# Title\n\n<script>alert("xss")</script>\n\nContent';
    const result = sanitizeMarkdown(input);
    expect(result).not.toContain('<script');
    expect(result).not.toContain('alert');
    expect(result).toContain('# Title');
  });

  it('replaces javascript: links with safe placeholder', () => {
    const input = '[Click me](javascript:alert(1))';
    const result = sanitizeMarkdown(input);
    expect(result).not.toContain('javascript:');
    expect(result).toContain('[Click me](#)');
  });

  it('replaces data: links with safe placeholder', () => {
    const input = '[link](data:text/html,evil)';
    const result = sanitizeMarkdown(input);
    expect(result).not.toContain('data:');
    expect(result).toContain('[link](#)');
  });

  it('preserves normal markdown', () => {
    const input = '# Heading\n\n**Bold** and *italic*\n\n[Link](https://example.com)';
    const result = sanitizeMarkdown(input);
    expect(result).toContain('# Heading');
    expect(result).toContain('**Bold**');
    expect(result).toContain('[Link](https://example.com)');
  });
});
