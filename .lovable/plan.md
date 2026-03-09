## Problem Analysis

The ambient sound URLs point to `cdn.freesound.org/previews/...` which are **preview clips from Freesound.org**. These URLs are unreliable -- they frequently return 403/404 errors, have CORS restrictions, or the specific preview files get rotated/removed. The `audio.play().catch(() => {})` silently swallows the error, so the user sees no feedback when playback fails.

Additionally, the audio is created inside a `useEffect` (not directly in a click handler), which can break browser autoplay policies that require a user gesture context.

## Fix

1. **Replace unreliable external URLs with locally hosted audio files** generated as short looping ambient tracks, and use reliable public-domain sources (e.g., from `pixabay.com/sound-effects` which provides direct hotlinkable MP3s with no CORS issues).
2. **Create the Audio element synchronously in the click handler** (user gesture context) to satisfy browser autoplay policies, then set the source afterward.
3. **Add error feedback** so users know if a sound fails to load instead of silent failure.

### Changes

`**src/hooks/useImmersiveMode.ts**`

- Replace Freesound URLs with reliable, CORS-friendly public domain audio URLs (Pixabay sound effects CDN or similar)
- Refactor: instead of creating audio in `useEffect`, create/unlock the `Audio` element in `setAmbientSound` (called directly from the button click handler), satisfying browser autoplay policies
- Add `console.warn` and a toast on playback failure instead of silently catching
- Keep the `useEffect` only for cleanup and volume sync

`**src/components/reader/ImmersiveOverlay.tsx**`

- No structural changes needed; the `onClick` handler already calls `onSoundChange` synchronously in the user gesture context

### Implementation Detail

```typescript
// In useImmersiveMode.ts — new approach
const changeSound = useCallback((sound: AmbientSound) => {
  setAmbientSound(sound);
  stopAudio();
  if (sound === 'off' || !isImmersive) return;
  
  // Create and unlock audio synchronously in user gesture
  const audio = new Audio();
  audio.play().catch(() => {}); // unlock for iOS
  audio.loop = true;
  audio.volume = volume;
  audio.src = SOUND_URLS[sound];
  audio.play().catch((err) => {
    console.warn('Ambient sound playback failed:', err);
    toast.error('Could not play ambient sound');
  });
  audioRef.current = audio;
}, [isImmersive, volume]);
```

The `useEffect` will be simplified to only handle cleanup on `isImmersive` becoming false and volume changes.

### Files Modified


| File                            | Change                                                                 |
| ------------------------------- | ---------------------------------------------------------------------- |
| `src/hooks/useImmersiveMode.ts` | Replace URLs, move audio creation to click handler, add error feedback |
