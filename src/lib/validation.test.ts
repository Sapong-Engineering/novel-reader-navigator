import { describe, it, expect } from 'vitest';
import { validateUrl, sanitizeUrl } from './validation';

describe('validateUrl', () => {
  it('rejects empty string', () => {
    const result = validateUrl('');
    expect(result.valid).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('rejects whitespace-only string', () => {
    const result = validateUrl('   ');
    expect(result.valid).toBe(false);
  });

  it('accepts valid https URL', () => {
    const result = validateUrl('https://example.com/novel/1');
    expect(result.valid).toBe(true);
    expect(result.sanitized).toBe('https://example.com/novel/1');
  });

  it('accepts valid http URL', () => {
    const result = validateUrl('http://example.com');
    expect(result.valid).toBe(true);
  });

  it('prepends https:// when protocol missing', () => {
    const result = validateUrl('example.com/novel');
    expect(result.valid).toBe(true);
    expect(result.sanitized).toBe('https://example.com/novel');
  });

  it('rejects javascript: protocol', () => {
    const result = validateUrl('javascript:alert(1)');
    expect(result.valid).toBe(false);
  });

  it('rejects data: protocol', () => {
    const result = validateUrl('data:text/html,<h1>xss</h1>');
    expect(result.valid).toBe(false);
  });

  it('rejects URL longer than 2048 characters', () => {
    const result = validateUrl('https://example.com/' + 'a'.repeat(2050));
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/maximum length/i);
  });

  it('rejects URL with no domain', () => {
    // URL with empty hostname
    const result = validateUrl('https://');
    expect(result.valid).toBe(false);
  });

  it('rejects ftp:// protocol', () => {
    const result = validateUrl('ftp://files.example.com');
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/protocol/i);
  });

  it('rejects <script in URL', () => {
    const result = validateUrl('<script>alert(1)</script>');
    expect(result.valid).toBe(false);
  });

  it('returns sanitized URL with trimmed whitespace', () => {
    const result = validateUrl('  https://example.com  ');
    expect(result.valid).toBe(true);
    expect(result.sanitized).toBe('https://example.com');
  });
});

describe('sanitizeUrl', () => {
  it('trims whitespace', () => {
    expect(sanitizeUrl('  https://example.com  ')).toBe('https://example.com');
  });

  it('prepends https when no protocol', () => {
    expect(sanitizeUrl('example.com')).toBe('https://example.com');
  });

  it('keeps existing https protocol', () => {
    expect(sanitizeUrl('https://example.com')).toBe('https://example.com');
  });

  it('keeps existing http protocol', () => {
    expect(sanitizeUrl('http://example.com')).toBe('http://example.com');
  });
});
