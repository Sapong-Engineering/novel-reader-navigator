
-- Create a public storage bucket for ambient sounds
INSERT INTO storage.buckets (id, name, public)
VALUES ('ambient-sounds', 'ambient-sounds', true);

-- Allow anyone to read files (public bucket for audio playback)
CREATE POLICY "Public read access for ambient sounds"
ON storage.objects FOR SELECT
USING (bucket_id = 'ambient-sounds');

-- Only admins can upload/update/delete
CREATE POLICY "Admins can upload ambient sounds"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'ambient-sounds'
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can update ambient sounds"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'ambient-sounds'
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can delete ambient sounds"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'ambient-sounds'
  AND public.has_role(auth.uid(), 'admin')
);
