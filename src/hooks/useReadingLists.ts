import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface ReadingList {
  id: string;
  name: string;
  icon: string;
  sort_order: number;
}

export interface ReadingListItem {
  id: string;
  list_id: string;
  novel_local_id: string;
}

const DEFAULT_LISTS = [
  { name: 'Plan to Read', icon: '📋', sort_order: 0 },
  { name: 'Currently Reading', icon: '📖', sort_order: 1 },
  { name: 'Completed', icon: '✅', sort_order: 2 },
];

export function useReadingLists() {
  const { user } = useAuth();
  const [lists, setLists] = useState<ReadingList[]>([]);
  const [items, setItems] = useState<ReadingListItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLists = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data: listsData } = await supabase
      .from('reading_lists')
      .select('id, name, icon, sort_order')
      .eq('user_id', user.id)
      .order('sort_order');

    let finalLists = (listsData ?? []) as ReadingList[];

    // Seed defaults if empty
    if (finalLists.length === 0) {
      const inserts = DEFAULT_LISTS.map(l => ({ ...l, user_id: user.id }));
      const { data: created } = await supabase
        .from('reading_lists')
        .insert(inserts)
        .select('id, name, icon, sort_order');
      finalLists = (created ?? []) as ReadingList[];
    }

    setLists(finalLists);

    // Fetch all items
    const { data: itemsData } = await supabase
      .from('reading_list_items')
      .select('id, list_id, novel_local_id')
      .eq('user_id', user.id);
    setItems((itemsData ?? []) as ReadingListItem[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchLists(); }, [fetchLists]);

  const addToList = useCallback(async (listId: string, novelLocalId: string) => {
    if (!user) return;
    await supabase.from('reading_list_items').insert({
      list_id: listId,
      novel_local_id: novelLocalId,
      user_id: user.id,
    });
    await fetchLists();
  }, [user, fetchLists]);

  const removeFromList = useCallback(async (listId: string, novelLocalId: string) => {
    if (!user) return;
    await supabase
      .from('reading_list_items')
      .delete()
      .eq('list_id', listId)
      .eq('novel_local_id', novelLocalId)
      .eq('user_id', user.id);
    await fetchLists();
  }, [user, fetchLists]);

  const createList = useCallback(async (name: string, icon: string = '📚') => {
    if (!user) return;
    const maxOrder = lists.reduce((m, l) => Math.max(m, l.sort_order), -1);
    await supabase.from('reading_lists').insert({
      user_id: user.id,
      name,
      icon,
      sort_order: maxOrder + 1,
    });
    await fetchLists();
  }, [user, lists, fetchLists]);

  const renameList = useCallback(async (listId: string, name: string) => {
    await supabase.from('reading_lists').update({ name }).eq('id', listId);
    await fetchLists();
  }, [fetchLists]);

  const deleteList = useCallback(async (listId: string) => {
    await supabase.from('reading_lists').delete().eq('id', listId);
    await fetchLists();
  }, [fetchLists]);

  const getNovelLists = useCallback((novelLocalId: string) => {
    return items.filter(i => i.novel_local_id === novelLocalId).map(i => i.list_id);
  }, [items]);

  const getListNovelIds = useCallback((listId: string) => {
    return items.filter(i => i.list_id === listId).map(i => i.novel_local_id);
  }, [items]);

  return {
    lists,
    items,
    loading,
    addToList,
    removeFromList,
    createList,
    renameList,
    deleteList,
    getNovelLists,
    getListNovelIds,
    refresh: fetchLists,
  };
}
