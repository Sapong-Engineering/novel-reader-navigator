import { supabase } from '@/integrations/supabase/client';

export interface NovelInfo {
  title: string;
  description: string;
  coverUrl?: string;
  chapters: { id: string; title: string; url: string; content?: string }[];
}

export interface SearchResult {
  title: string;
  url: string;
  description: string;
  source: string;
  author?: string;
}

export async function scrapeNovelInfo(url: string): Promise<NovelInfo> {
  const { data, error } = await supabase.functions.invoke('scrape-novel', {
    body: { url },
  });

  if (error) throw new Error(error.message);
  if (!data?.success) throw new Error(data?.error || 'Failed to scrape novel');

  return data.data;
}

export async function scrapeChapterContent(url: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke('scrape-chapter', {
    body: { url },
  });

  if (error) throw new Error(error.message);
  if (!data?.success) throw new Error(data?.error || 'Failed to scrape chapter');

  return data.data.content;
}

export async function searchNovels(query: string): Promise<SearchResult[]> {
  const { data, error } = await supabase.functions.invoke('search-novels', {
    body: { query },
  });

  if (error) throw new Error(error.message);
  if (!data?.success) throw new Error(data?.error || 'Search failed');

  return data.data;
}

export interface ActiveSource {
  key: string;
  label: string;
  enabled: boolean;
}

const ADAPTER_MAP: Record<string, string> = {
  adapter_wuxiaclick: 'WuxiaClick',
  adapter_novelbin: 'NovelBin',
  adapter_empirenovel: 'EmpireNovel',
  adapter_gutenberg: 'Gutenberg',
};

export async function getActiveSources(): Promise<ActiveSource[]> {
  const keys = Object.keys(ADAPTER_MAP);
  const { data } = await supabase
    .from('admin_settings')
    .select('key, value')
    .in('key', keys);

  return keys.map((key) => {
    const row = data?.find((r) => r.key === key);
    const enabled = row ? row.value === true || row.value === 'true' : true;
    return { key, label: ADAPTER_MAP[key], enabled };
  });
}
