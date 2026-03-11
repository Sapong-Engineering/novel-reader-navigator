export interface ChapterInfo {
  id: string;
  title: string;
  url: string;
  /** Pre-loaded content (e.g. Gutenberg books where all text comes in one fetch) */
  content?: string;
}

export interface NovelInfo {
  title: string;
  description: string;
  coverUrl?: string;
  chapters: ChapterInfo[];
}

export interface SiteAdapter {
  /** URL pattern this adapter handles (matched against hostname) */
  readonly urlPattern: RegExp | null;

  /** Extract novel info from scraped markdown/links/metadata */
  extractNovelInfo(params: {
    baseUrl: string;
    markdown: string;
    links: string[];
    metadata: Record<string, string>;
  }): NovelInfo;
}

export class AdapterRegistry {
  private adapters: SiteAdapter[] = [];
  private defaultAdapter: SiteAdapter;

  constructor(defaultAdapter: SiteAdapter) {
    this.defaultAdapter = defaultAdapter;
  }

  register(adapter: SiteAdapter): void {
    this.adapters.push(adapter);
  }

  getAdapter(url: string): SiteAdapter {
    try {
      const { hostname } = new URL(url);
      for (const adapter of this.adapters) {
        if (adapter.urlPattern && adapter.urlPattern.test(hostname)) {
          return adapter;
        }
      }
    } catch {
      // Invalid URL, fall through to default
    }
    return this.defaultAdapter;
  }
}
