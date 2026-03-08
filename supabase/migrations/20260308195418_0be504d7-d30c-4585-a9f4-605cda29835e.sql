
-- Reading Stats table
CREATE TABLE public.reading_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  reading_seconds int NOT NULL DEFAULT 0,
  chapters_read int NOT NULL DEFAULT 0,
  words_read int NOT NULL DEFAULT 0,
  UNIQUE(user_id, date)
);
ALTER TABLE public.reading_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can select own stats" ON public.reading_stats FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own stats" ON public.reading_stats FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own stats" ON public.reading_stats FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Reading Lists table
CREATE TABLE public.reading_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  icon text DEFAULT '📚',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.reading_lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can select own lists" ON public.reading_lists FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own lists" ON public.reading_lists FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own lists" ON public.reading_lists FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own lists" ON public.reading_lists FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Reading List Items table
CREATE TABLE public.reading_list_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id uuid NOT NULL REFERENCES public.reading_lists(id) ON DELETE CASCADE,
  novel_local_id text NOT NULL,
  user_id uuid NOT NULL,
  added_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(list_id, novel_local_id)
);
ALTER TABLE public.reading_list_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can select own list items" ON public.reading_list_items FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own list items" ON public.reading_list_items FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own list items" ON public.reading_list_items FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Chapter Updates table
CREATE TABLE public.chapter_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  novel_id uuid NOT NULL REFERENCES public.novels(id) ON DELETE CASCADE,
  novel_title text NOT NULL DEFAULT '',
  chapter_count int NOT NULL DEFAULT 0,
  discovered_at timestamptz NOT NULL DEFAULT now(),
  seen boolean NOT NULL DEFAULT false
);
ALTER TABLE public.chapter_updates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can select own updates" ON public.chapter_updates FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update own updates" ON public.chapter_updates FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own updates" ON public.chapter_updates FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Service can insert updates" ON public.chapter_updates FOR INSERT TO authenticated WITH CHECK (true);
