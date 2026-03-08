import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function useReadingStats(isReading: boolean) {
  const { user } = useAuth();
  const secondsRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const flush = useCallback(async () => {
    if (!user || secondsRef.current <= 0) return;
    const seconds = secondsRef.current;
    secondsRef.current = 0;

    const today = new Date().toISOString().slice(0, 10);
    // Try update first
    const { data } = await supabase
      .from('reading_stats')
      .select('id, reading_seconds')
      .eq('user_id', user.id)
      .eq('date', today)
      .maybeSingle();

    if (data) {
      await supabase
        .from('reading_stats')
        .update({ reading_seconds: data.reading_seconds + seconds })
        .eq('id', data.id);
    } else {
      await supabase.from('reading_stats').insert({
        user_id: user.id,
        date: today,
        reading_seconds: seconds,
      });
    }
  }, [user]);

  // Count seconds while reading
  useEffect(() => {
    if (!isReading || !user) return;
    intervalRef.current = setInterval(() => {
      secondsRef.current += 1;
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [isReading, user]);

  // Flush every 60s
  useEffect(() => {
    if (!user) return;
    const timer = setInterval(flush, 60000);
    return () => {
      clearInterval(timer);
      flush();
    };
  }, [user, flush]);

  const recordChapterRead = useCallback(async (wordCount: number) => {
    if (!user) return;
    const today = new Date().toISOString().slice(0, 10);
    const { data } = await supabase
      .from('reading_stats')
      .select('id, chapters_read, words_read')
      .eq('user_id', user.id)
      .eq('date', today)
      .maybeSingle();

    if (data) {
      await supabase
        .from('reading_stats')
        .update({
          chapters_read: data.chapters_read + 1,
          words_read: data.words_read + wordCount,
        })
        .eq('id', data.id);
    } else {
      await supabase.from('reading_stats').insert({
        user_id: user.id,
        date: today,
        chapters_read: 1,
        words_read: wordCount,
      });
    }
  }, [user]);

  return { flush, recordChapterRead };
}
