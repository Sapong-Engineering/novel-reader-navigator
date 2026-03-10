

# OpenAI TTS Integration Plan

## Overview
Add OpenAI's TTS API as an alternative voice engine alongside the existing browser Web Speech API. OpenAI offers natural-sounding voices (alloy, echo, fable, onyx, nova, shimmer) via their `/v1/audio/speech` endpoint.

## Setup Required
You'll need to provide an OpenAI API key. Lovable will securely store it as a backend secret. I'll walk you through where to get it from OpenAI's platform.

## Changes

### 1. Backend: Create `openai-tts` edge function
- Accepts `{ text, voice, speed }` from the client
- Calls OpenAI `/v1/audio/speech` with model `tts-1` (fast) or `tts-1-hd` (higher quality)
- Voices: alloy, echo, fable, onyx, nova, shimmer
- Speed range: 0.25 to 4.0 (maps directly to existing speed options)
- Returns MP3 audio binary

### 2. Refactor `useTTS.ts`
- Add `ttsEngine` state: `'browser' | 'ai'` (default `'browser'`)
- Add curated AI voice list with display names (e.g., "Nova", "Alloy", "Shimmer")
- When engine is `'ai'`:
  - Fetch audio from the edge function per paragraph
  - Play via `HTMLAudioElement` with `pause()`/`play()` support
  - Pre-fetch next paragraph for gapless playback
  - On `ended`, advance to next paragraph
- Persist engine choice in localStorage

### 3. Update `TTSControls.tsx`
- Add a Browser/AI toggle (segmented control)
- When AI is selected, show AI voice picker (Nova, Alloy, etc.) instead of browser voices
- Speed selector works for both engines (OpenAI supports 0.25-4.0 so all current speeds map directly)
- Show subtle "AI" badge when AI engine is active

### 4. Wire through `ReaderView.tsx` and `Reader.tsx`
- Pass new engine-related props through to TTSControls

## Architecture
```text
User clicks Play (AI mode)
  → useTTS → fetch(edge-fn/openai-tts, {text, voice, speed})
  → Edge function → OpenAI /v1/audio/speech
  → Returns MP3 → HTMLAudioElement plays
  → onended → next paragraph (prefetches ahead)
```

## Notes
- Browser TTS remains the default (free, no API costs)
- OpenAI TTS costs ~$0.015 per 1K characters (tts-1) -- affordable for novel reading
- If the API key isn't configured, the AI option shows a message to set it up
- All existing speed values (0.5, 0.75, 1, 1.25, 1.5, 2) are within OpenAI's supported range

