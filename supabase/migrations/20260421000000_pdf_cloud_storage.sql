-- Add PDF metadata columns to the novels table
ALTER TABLE public.novels
  ADD COLUMN IF NOT EXISTS source_type text NOT NULL DEFAULT 'web',
  ADD COLUMN IF NOT EXISTS reader_mode text NOT NULL DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS storage_bucket text,
  ADD COLUMN IF NOT EXISTS storage_path text,
  ADD COLUMN IF NOT EXISTS source_file_name text,
  ADD COLUMN IF NOT EXISTS source_file_size bigint,
  ADD COLUMN IF NOT EXISTS page_count integer;

CREATE INDEX IF NOT EXISTS novels_user_source_type_idx
  ON public.novels(user_id, source_type);

-- Create private user-pdfs storage bucket (50 MB limit)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'user-pdfs',
  'user-pdfs',
  false,
  52428800,
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- RLS: users can only access their own files
-- Path convention: {userId}/{novelId}.pdf
CREATE POLICY "Users can upload own PDFs"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'user-pdfs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can read own PDFs"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'user-pdfs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own PDFs"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'user-pdfs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
