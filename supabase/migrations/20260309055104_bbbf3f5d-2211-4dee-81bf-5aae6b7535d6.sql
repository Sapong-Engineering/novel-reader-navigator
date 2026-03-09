
-- Drop all existing RESTRICTIVE policies and recreate as PERMISSIVE

-- ========== admin_settings ==========
DROP POLICY IF EXISTS "Admins can delete settings" ON public.admin_settings;
DROP POLICY IF EXISTS "Admins can insert settings" ON public.admin_settings;
DROP POLICY IF EXISTS "Admins can read settings" ON public.admin_settings;
DROP POLICY IF EXISTS "Admins can update settings" ON public.admin_settings;
DROP POLICY IF EXISTS "Anyone can read adapter settings" ON public.admin_settings;

CREATE POLICY "Admins can delete settings" ON public.admin_settings FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can insert settings" ON public.admin_settings FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can read settings" ON public.admin_settings FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update settings" ON public.admin_settings FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can read adapter settings" ON public.admin_settings FOR SELECT TO authenticated USING (key = ANY (ARRAY['adapter_wuxiaclick'::text, 'adapter_novelbin'::text, 'adapter_empirenovel'::text]));

-- ========== bookmarks ==========
DROP POLICY IF EXISTS "Users can delete own bookmarks" ON public.bookmarks;
DROP POLICY IF EXISTS "Users can insert own bookmarks" ON public.bookmarks;
DROP POLICY IF EXISTS "Users can select own bookmarks" ON public.bookmarks;
DROP POLICY IF EXISTS "Users can update own bookmarks" ON public.bookmarks;

CREATE POLICY "Users can delete own bookmarks" ON public.bookmarks FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own bookmarks" ON public.bookmarks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can select own bookmarks" ON public.bookmarks FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update own bookmarks" ON public.bookmarks FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ========== chapter_updates ==========
DROP POLICY IF EXISTS "Users can delete own updates" ON public.chapter_updates;
DROP POLICY IF EXISTS "Users can insert own updates" ON public.chapter_updates;
DROP POLICY IF EXISTS "Users can select own updates" ON public.chapter_updates;
DROP POLICY IF EXISTS "Users can update own updates" ON public.chapter_updates;

CREATE POLICY "Users can delete own updates" ON public.chapter_updates FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own updates" ON public.chapter_updates FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can select own updates" ON public.chapter_updates FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update own updates" ON public.chapter_updates FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ========== chapters ==========
DROP POLICY IF EXISTS "Admins can view all chapters" ON public.chapters;
DROP POLICY IF EXISTS "Users can delete own chapters" ON public.chapters;
DROP POLICY IF EXISTS "Users can insert own chapters" ON public.chapters;
DROP POLICY IF EXISTS "Users can select own chapters" ON public.chapters;
DROP POLICY IF EXISTS "Users can update own chapters" ON public.chapters;

CREATE POLICY "Admins can view all chapters" ON public.chapters FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can delete own chapters" ON public.chapters FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own chapters" ON public.chapters FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can select own chapters" ON public.chapters FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update own chapters" ON public.chapters FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ========== novels ==========
DROP POLICY IF EXISTS "Admins can delete any novel" ON public.novels;
DROP POLICY IF EXISTS "Admins can view all novels" ON public.novels;
DROP POLICY IF EXISTS "Users can delete own novels" ON public.novels;
DROP POLICY IF EXISTS "Users can insert own novels" ON public.novels;
DROP POLICY IF EXISTS "Users can select own novels" ON public.novels;
DROP POLICY IF EXISTS "Users can update own novels" ON public.novels;

CREATE POLICY "Admins can delete any novel" ON public.novels FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can view all novels" ON public.novels FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can delete own novels" ON public.novels FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own novels" ON public.novels FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can select own novels" ON public.novels FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update own novels" ON public.novels FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ========== profiles ==========
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

CREATE POLICY "Admins can update all profiles" ON public.profiles FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);

-- ========== reading_list_items ==========
DROP POLICY IF EXISTS "Users can delete own list items" ON public.reading_list_items;
DROP POLICY IF EXISTS "Users can insert own list items" ON public.reading_list_items;
DROP POLICY IF EXISTS "Users can select own list items" ON public.reading_list_items;

CREATE POLICY "Users can delete own list items" ON public.reading_list_items FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own list items" ON public.reading_list_items FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can select own list items" ON public.reading_list_items FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ========== reading_lists ==========
DROP POLICY IF EXISTS "Users can delete own lists" ON public.reading_lists;
DROP POLICY IF EXISTS "Users can insert own lists" ON public.reading_lists;
DROP POLICY IF EXISTS "Users can select own lists" ON public.reading_lists;
DROP POLICY IF EXISTS "Users can update own lists" ON public.reading_lists;

CREATE POLICY "Users can delete own lists" ON public.reading_lists FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own lists" ON public.reading_lists FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can select own lists" ON public.reading_lists FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update own lists" ON public.reading_lists FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ========== reading_progress ==========
DROP POLICY IF EXISTS "Users can delete own progress" ON public.reading_progress;
DROP POLICY IF EXISTS "Users can insert own progress" ON public.reading_progress;
DROP POLICY IF EXISTS "Users can select own progress" ON public.reading_progress;
DROP POLICY IF EXISTS "Users can update own progress" ON public.reading_progress;

CREATE POLICY "Users can delete own progress" ON public.reading_progress FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own progress" ON public.reading_progress FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can select own progress" ON public.reading_progress FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update own progress" ON public.reading_progress FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ========== reading_stats ==========
DROP POLICY IF EXISTS "Users can insert own stats" ON public.reading_stats;
DROP POLICY IF EXISTS "Users can select own stats" ON public.reading_stats;
DROP POLICY IF EXISTS "Users can update own stats" ON public.reading_stats;

CREATE POLICY "Users can insert own stats" ON public.reading_stats FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can select own stats" ON public.reading_stats FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update own stats" ON public.reading_stats FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ========== user_roles ==========
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;

CREATE POLICY "Admins can manage all roles" ON public.user_roles FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
