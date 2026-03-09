import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export type AmbientSound = 'off' | 'rain' | 'fireplace' | 'cafe';

const BUCKET = 'ambient-sounds';

function getPublicUrl(soundKey: string): string {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(`${soundKey}.mp3`);
  return data.publicUrl;
}

export function useImmersiveMode() {
  const [isImmersive, setIsImmersive] = useState(false);
  const [ambientSound, setAmbientSoundState] = useState<AmbientSound>('off');
  const [volume, setVolume] = useState(0.4);
  const [controlsVisible, setControlsVisible] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout>>();

  function stopAudio() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
  }

  function scheduleHide() {
    clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setControlsVisible(false), 3000);
  }

  const enter = useCallback(() => {
    setIsImmersive(true);
    setControlsVisible(true);
    scheduleHide();
  }, []);

  const exit = useCallback(() => {
    setIsImmersive(false);
    stopAudio();
    setAmbientSoundState('off');
  }, []);

  const toggleImmersive = useCallback(() => {
    if (isImmersive) exit();
    else enter();
  }, [isImmersive, enter, exit]);

  // Called directly from click handler (user gesture context)
  const setAmbientSound = useCallback((sound: AmbientSound) => {
    setAmbientSoundState(sound);
    stopAudio();

    if (sound === 'off' || !isImmersive) return;

    // Create and start audio synchronously in user gesture to satisfy autoplay policy
    const audio = new Audio();
    audio.loop = true;
    audio.volume = volume;
    audioRef.current = audio;

    // Start with a silent play to unlock audio context in user gesture
    audio.play().catch(() => {});

    // Fetch signed URL then set source
    supabase.storage
      .from(BUCKET)
      .createSignedUrl(`${sound}.mp3`, 3600)
      .then(({ data, error }) => {
        if (error || !data?.signedUrl) {
          console.error('Failed to get sound URL:', error);
          toast.error('Sound file not found. Upload it in Admin → Preferences.');
          stopAudio();
          setAmbientSoundState('off');
          return;
        }
        // Set source and play — audio context already unlocked
        audio.src = data.signedUrl;
        audio.play().catch((err) => {
          console.warn('Ambient sound playback failed:', err);
          toast.error('Could not play ambient sound');
          stopAudio();
          setAmbientSoundState('off');
        });
      });
  }, [isImmersive, volume]);

  const showControls = useCallback(() => {
    setControlsVisible(true);
    scheduleHide();
  }, []);

  // Volume sync
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  // Stop audio when leaving immersive mode
  useEffect(() => {
    if (!isImmersive) {
      stopAudio();
      setAmbientSoundState('off');
    }
  }, [isImmersive]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAudio();
      clearTimeout(hideTimerRef.current);
    };
  }, []);

  return {
    isImmersive,
    ambientSound: ambientSound,
    setAmbientSound,
    volume,
    setVolume,
    controlsVisible,
    showControls,
    enter,
    exit,
    toggleImmersive,
  };
}
