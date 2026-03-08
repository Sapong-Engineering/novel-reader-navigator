CREATE POLICY "Anyone can read adapter settings"
ON public.admin_settings
FOR SELECT
TO authenticated, anon
USING (key IN ('adapter_wuxiaclick', 'adapter_novelbin', 'adapter_empirenovel'));