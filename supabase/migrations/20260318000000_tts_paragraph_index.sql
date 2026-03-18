-- Add TTS paragraph position to reading_progress
ALTER TABLE public.reading_progress
  ADD COLUMN IF NOT EXISTS tts_paragraph_index integer;
