import { supabase } from '@/integrations/supabase/client';

export interface NovelInfo {
  title: string;
  description: string;
  coverUrl?: string;
  chapters: { id: string; title: string; url: string }[];
}

export interface SearchResult {
  title: string;
  url: string;
  description: string;
  source: string;
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
