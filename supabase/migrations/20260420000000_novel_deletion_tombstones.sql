-- Durable deletion tombstones prevent stale devices from re-uploading novels
-- that were intentionally removed on another device or by an admin.

CREATE TABLE IF NOT EXISTS public.novel_deletions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  local_id text NOT NULL,
  url text,
  title text,
  deleted_at timestamptz NOT NULL DEFAULT now(),
  deleted_by uuid,
  source text NOT NULL DEFAULT 'user',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, local_id)
);

CREATE INDEX IF NOT EXISTS novel_deletions_user_deleted_at_idx
  ON public.novel_deletions(user_id, deleted_at DESC);

CREATE INDEX IF NOT EXISTS novel_deletions_user_url_idx
  ON public.novel_deletions(user_id, url)
  WHERE url IS NOT NULL;

ALTER TABLE public.novel_deletions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can select own novel deletions" ON public.novel_deletions;
DROP POLICY IF EXISTS "Users can insert own novel deletions" ON public.novel_deletions;
DROP POLICY IF EXISTS "Users can update own novel deletions" ON public.novel_deletions;
DROP POLICY IF EXISTS "Admins can view all novel deletions" ON public.novel_deletions;
DROP POLICY IF EXISTS "Admins can manage all novel deletions" ON public.novel_deletions;

CREATE POLICY "Users can select own novel deletions"
  ON public.novel_deletions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own novel deletions"
  ON public.novel_deletions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own novel deletions"
  ON public.novel_deletions
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all novel deletions"
  ON public.novel_deletions
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage all novel deletions"
  ON public.novel_deletions
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
