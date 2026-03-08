import { useState, useCallback, useRef, useEffect } from 'react';

export type AmbientSound = 'off' | 'rain' | 'fireplace' | 'cafe';

const SOUND_URLS: Record<Exclude<AmbientSound, 'off'>, string> = {
  rain: 'https://cdn.freesound.org/previews/531/531947_6386073-lq.mp3',
  fireplace: 'https://cdn.freesound.org/previews/137/137744_2484823-lq.mp3',
  cafe: 'https://cdn.freesound.org/previews/458/458604_3905081-lq.mp3',
};

export function useImmersiveMode() {
  const [isImmersive, setIsImmersive] = useState(false);
  const [ambientSound, setAmbientSound] = useState<AmbientSound>('off');
  const [volume, setVolume] = useState(0.4);
  const [controlsVisible, setControlsVisible] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const enter = useCallback(() => {
    setIsImmersive(true);
    setControlsVisible(true);
    scheduleHide();
  }, []);

  const exit = useCallback(() => {
    setIsImmersive(false);
    stopAudio();
    setAmbientSound('off');
  }, []);

  const toggleImmersive = useCallback(() => {
    if (isImmersive) exit();
    else enter();
  }, [isImmersive, enter, exit]);

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

  const showControls = useCallback(() => {
    setControlsVisible(true);
    scheduleHide();
  }, []);

  // Handle sound changes
  useEffect(() => {
    if (!isImmersive || ambientSound === 'off') {
      stopAudio();
      return;
    }
    stopAudio();
    const audio = new Audio(SOUND_URLS[ambientSound]);
    audio.loop = true;
    audio.volume = volume;
    audio.play().catch(() => {});
    audioRef.current = audio;
    return () => stopAudio();
  }, [ambientSound, isImmersive]);

  // Handle volume changes
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAudio();
      clearTimeout(hideTimerRef.current);
    };
  }, []);

  return {
    isImmersive,
    ambientSound,
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
