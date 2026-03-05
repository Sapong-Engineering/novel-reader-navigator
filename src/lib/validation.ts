export interface ValidationResult {
  valid: boolean;
  error?: string;
  sanitized?: string;
}

export interface URLValidationRules {
  allowedProtocols: string[];
  maxLength: number;
  requireDomain: boolean;
}

const DEFAULT_RULES: URLValidationRules = {
  allowedProtocols: ['http:', 'https:'],
  maxLength: 2048,
  requireDomain: true,
};

const MALICIOUS_PATTERNS = [
  /^javascript:/i,
  /^data:/i,
  /^vbscript:/i,
  /<script/i,
];

export function sanitizeUrl(raw: string): string {
  let url = raw.trim();
  if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`;
  }
  return url;
}

export function validateUrl(
  raw: string,
  rules: URLValidationRules = DEFAULT_RULES,
): ValidationResult {
  if (!raw || !raw.trim()) {
    return { valid: false, error: 'URL is required' };
  }

  const trimmed = raw.trim();

  for (const pattern of MALICIOUS_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { valid: false, error: 'URL contains disallowed content' };
    }
  }

  // If raw URL has an explicit protocol (e.g. ftp://), validate it before sanitizing
  const protocolMatch = /^([a-zA-Z][a-zA-Z0-9+\-.]*):\/\//.exec(trimmed);
  if (protocolMatch) {
    const rawProtocol = protocolMatch[1].toLowerCase() + ':';
    if (!rules.allowedProtocols.includes(rawProtocol)) {
      return {
        valid: false,
        error: `URL must use ${rules.allowedProtocols.join(' or ')} protocol`,
      };
    }
  }

  const sanitized = sanitizeUrl(raw);

  if (sanitized.length > rules.maxLength) {
    return { valid: false, error: `URL exceeds maximum length of ${rules.maxLength} characters` };
  }

  let parsed: URL;
  try {
    parsed = new URL(sanitized);
  } catch {
    return { valid: false, error: 'URL is not valid' };
  }

  if (!rules.allowedProtocols.includes(parsed.protocol)) {
    return {
      valid: false,
      error: `URL must use ${rules.allowedProtocols.join(' or ')} protocol`,
    };
  }

  if (rules.requireDomain && (!parsed.hostname || parsed.hostname === '')) {
    return { valid: false, error: 'URL must include a domain' };
  }

  return { valid: true, sanitized };
}
