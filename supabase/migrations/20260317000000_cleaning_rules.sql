-- cleaning_rules table
-- Stores AI-generated (and admin-added) noise-removal regex rules.
-- Rules are applied dynamically at chapter-fetch time without requiring
-- an edge function redeployment.

CREATE TABLE public.cleaning_rules (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern     text        NOT NULL,         -- JS-compatible regex source string (no slashes)
  flags       text        NOT NULL DEFAULT 'gim',
  description text        NOT NULL,
  source_url  text,                         -- chapter URL that triggered this rule (nullable)
  created_by  uuid        REFERENCES auth.users(id) ON DELETE SET NULL,  -- null = AI-generated
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cleaning_rules ENABLE ROW LEVEL SECURITY;

-- Public SELECT: scrape-chapter edge function (runs with anon key) must read rules
CREATE POLICY "public_read_cleaning_rules"
  ON public.cleaning_rules FOR SELECT
  USING (true);

-- Admin write: insert/update/delete require admin role
-- (Service role used by edge functions bypasses RLS entirely)
CREATE POLICY "admin_write_cleaning_rules"
  ON public.cleaning_rules
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE INDEX cleaning_rules_created_at_idx ON public.cleaning_rules (created_at ASC);
