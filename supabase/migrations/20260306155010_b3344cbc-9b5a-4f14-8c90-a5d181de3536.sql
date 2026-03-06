
-- novels table
CREATE TABLE public.novels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  url text NOT NULL,
  cover_url text,
  description text,
  local_id text NOT NULL,
  saved_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.novels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own novels" ON public.novels FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own novels" ON public.novels FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own novels" ON public.novels FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own novels" ON public.novels FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE UNIQUE INDEX novels_user_local_id ON public.novels(user_id, local_id);

-- chapters table
CREATE TABLE public.chapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  novel_id uuid REFERENCES public.novels(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  local_id text NOT NULL,
  title text NOT NULL,
  url text NOT NULL,
  content text,
  saved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own chapters" ON public.chapters FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own chapters" ON public.chapters FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own chapters" ON public.chapters FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own chapters" ON public.chapters FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE UNIQUE INDEX chapters_novel_local_id ON public.chapters(novel_id, local_id);

-- bookmarks table
CREATE TABLE public.bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  novel_id uuid REFERENCES public.novels(id) ON DELETE CASCADE NOT NULL,
  chapter_local_id text NOT NULL,
  chapter_title text NOT NULL,
  scroll_position double precision NOT NULL DEFAULT 0,
  label text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own bookmarks" ON public.bookmarks FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own bookmarks" ON public.bookmarks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own bookmarks" ON public.bookmarks FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own bookmarks" ON public.bookmarks FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- reading_progress table
CREATE TABLE public.reading_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  novel_id uuid REFERENCES public.novels(id) ON DELETE CASCADE NOT NULL,
  chapter_local_id text NOT NULL,
  scroll_position double precision NOT NULL DEFAULT 0,
  is_last_read boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, novel_id, chapter_local_id)
);

ALTER TABLE public.reading_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own progress" ON public.reading_progress FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own progress" ON public.reading_progress FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own progress" ON public.reading_progress FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own progress" ON public.reading_progress FOR DELETE TO authenticated USING (auth.uid() = user_id);
