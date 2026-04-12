const HOTLINK_BLOCKED_HOSTS = new Set([
  'empirenovel.com',
  'www.empirenovel.com',
]);

const failedCoverUrls = new Set<string>();

function normalizeCoverUrl(coverUrl: string): string | null {
  try {
    const parsed = new URL(coverUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

export function getRenderableCoverUrl(coverUrl?: string | null): string | undefined {
  if (!coverUrl) return undefined;

  const normalized = normalizeCoverUrl(coverUrl);
  if (!normalized) return undefined;

  const host = new URL(normalized).hostname.toLowerCase();
  if (HOTLINK_BLOCKED_HOSTS.has(host) || failedCoverUrls.has(normalized)) {
    return undefined;
  }

  return normalized;
}

export function markCoverUrlFailed(coverUrl: string): void {
  const normalized = normalizeCoverUrl(coverUrl);
  if (normalized) {
    failedCoverUrls.add(normalized);
  }
}

export function resetFailedCoverUrls(): void {
  failedCoverUrls.clear();
}
