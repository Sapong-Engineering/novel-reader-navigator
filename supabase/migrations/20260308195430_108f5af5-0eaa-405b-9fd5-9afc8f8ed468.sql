
DROP POLICY "Service can insert updates" ON public.chapter_updates;
CREATE POLICY "Users can insert own updates" ON public.chapter_updates FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
