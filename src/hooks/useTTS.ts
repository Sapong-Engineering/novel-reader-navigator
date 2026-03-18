import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type TTSSpeed = 0.5 | 0.75 | 1 | 1.25 | 1.5 | 2;
export type TTSEngine = 'browser' | 'ai';

export interface AIVoice {
  id: string;
  name: string;
}

export const AI_VOICES: AIVoice[] = [
  { id: 'nova', name: 'Nova' },
  { id: 'alloy', name: 'Alloy' },
  { id: 'echo', name: 'Echo' },
  { id: 'fable', name: 'Fable' },
  { id: 'onyx', name: 'Onyx' },
  { id: 'shimmer', name: 'Shimmer' },
];

const TTS_ENGINE_KEY = 'tts-engine';
const TTS_AI_VOICE_KEY = 'tts-ai-voice';

function getStoredEngine(): TTSEngine {
  try {
    const v = localStorage.getItem(TTS_ENGINE_KEY);
    return v === 'ai' ? 'ai' : 'browser';
  } catch { return 'browser'; }
}

function getStoredAiVoice(): string {
  try {
    return localStorage.getItem(TTS_AI_VOICE_KEY) || 'nova';
  } catch { return 'nova'; }
}

export function useTTS(onChapterEnd?: () => void) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [speed, setSpeed] = useState<TTSSpeed>(1);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [ttsEngine, setTtsEngineState] = useState<TTSEngine>(getStoredEngine);
  const [selectedAiVoice, setSelectedAiVoiceState] = useState<string>(getStoredAiVoice);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const paragraphsRef = useRef<string[]>([]);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const isPlayingRef = useRef(false);
  const speedRef = useRef(speed);
  const voiceRef = useRef(selectedVoice);
  // Single persistent audio element — iOS keeps user-activated status on it across src changes.
  // Nulled only on unmount; never nulled during normal stop/jump operations.
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Tracks the blob: URL currently loaded into audioRef so we can revoke it properly.
  const currentObjectUrlRef = useRef<string | null>(null);
  const prefetchRef = useRef<{ index: number; blob: Blob } | null>(null);
  const engineRef = useRef(ttsEngine);
  const aiVoiceRef = useRef(selectedAiVoice);
  // Tracks current index for visibility-based resume
  const currentIndexRef = useRef(0);
  // Incremented on every new playAiParagraph call; stale async fetches abort when mismatched
  const playGenerationRef = useRef(0);

  speedRef.current = speed;
  voiceRef.current = selectedVoice;
  engineRef.current = ttsEngine;
  aiVoiceRef.current = selectedAiVoice;

  // Initialize single persistent audio element on mount.
  // Reusing the same element across paragraphs is the key iOS fix:
  // iOS only grants "user-activated" playback rights to the original element that
  // received the first user-gesture play(). Creating new Audio() per paragraph loses that.
  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;
    return () => {
      audio.pause();
      audio.src = '';
      audioRef.current = null;
      if (currentObjectUrlRef.current) {
        URL.revokeObjectURL(currentObjectUrlRef.current);
        currentObjectUrlRef.current = null;
      }
    };
  }, []);

  const setTtsEngine = useCallback((engine: TTSEngine) => {
    setTtsEngineState(engine);
    try { localStorage.setItem(TTS_ENGINE_KEY, engine); } catch {}
  }, []);

  const setSelectedAiVoice = useCallback((voice: string) => {
    setSelectedAiVoiceState(voice);
    try { localStorage.setItem(TTS_AI_VOICE_KEY, voice); } catch {}
  }, []);

  // Load browser voices
  useEffect(() => {
    const loadVoices = () => {
      const v = speechSynthesis.getVoices().filter(voice => voice.lang.startsWith('en'));
      setVoices(v);
      if (v.length > 0 && !selectedVoice) {
        const defaultVoice = v.find(voice => voice.default) || v[0];
        setSelectedVoice(defaultVoice.name);
      }
    };
    loadVoices();
    speechSynthesis.addEventListener('voiceschanged', loadVoices);
    return () => speechSynthesis.removeEventListener('voiceschanged', loadVoices);
  }, []);

  const setParagraphs = useCallback((content: string) => {
    const paras = content
      .split('\n\n')
      .map(p => p.trim())
      .filter(p => p.length > 0);
    paragraphsRef.current = paras;
    setCurrentIndex(0);
    prefetchRef.current = null;
  }, []);

  // --- AI TTS helpers ---
  const fetchAiAudio = useCallback(async (text: string): Promise<Blob> => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/openai-tts`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        text,
        voice: aiVoiceRef.current,
        speed: speedRef.current,
      }),
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(err.error || `TTS request failed [${resp.status}]`);
    }
    return resp.blob();
  }, []);

  // Retry wrapper — 2 retries with 500ms delay for network glitches on mobile
  const fetchAiAudioWithRetry = useCallback(async (text: string, retries = 2): Promise<Blob> => {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await fetchAiAudio(text);
      } catch (err) {
        if (attempt === retries) throw err;
        await new Promise(r => setTimeout(r, 500));
      }
    }
    throw new Error('Unreachable');
  }, [fetchAiAudio]);

  const prefetchNext = useCallback((nextIndex: number) => {
    if (nextIndex >= paragraphsRef.current.length) return;
    // Don't start a redundant prefetch if we already have this index cached
    if (prefetchRef.current?.index === nextIndex) return;
    const text = paragraphsRef.current[nextIndex];
    fetchAiAudio(text)
      .then(blob => { prefetchRef.current = { index: nextIndex, blob }; })
      .catch(() => { /* silent prefetch failure */ });
  }, [fetchAiAudio]);

  const playAiParagraph = useCallback(async (index: number) => {
    // Claim this generation — any older in-flight call will see a mismatch and abort
    const myGeneration = ++playGenerationRef.current;

    if (index >= paragraphsRef.current.length) {
      setIsPlaying(false);
      setIsPaused(false);
      setIsAiLoading(false);
      isPlayingRef.current = false;
      if (autoAdvance) onChapterEnd?.();
      return;
    }

    setIsAiLoading(true);
    setCurrentIndex(index);
    currentIndexRef.current = index;

    try {
      let blob: Blob;
      if (prefetchRef.current?.index === index) {
        blob = prefetchRef.current.blob;
        prefetchRef.current = null;
      } else {
        blob = await fetchAiAudioWithRetry(paragraphsRef.current[index]);
      }

      // Abort if a newer call superseded us or playback was stopped
      if (myGeneration !== playGenerationRef.current || !isPlayingRef.current) return;

      // Start prefetching the NEXT paragraph immediately after we have this blob.
      // This maximises the chance the next blob is ready by the time onended fires,
      // avoiding an await inside the callback (which breaks iOS gesture continuation).
      prefetchNext(index + 1);

      // Revoke the previous object URL now that we have the new blob ready.
      if (currentObjectUrlRef.current) {
        URL.revokeObjectURL(currentObjectUrlRef.current);
      }
      const objectUrl = URL.createObjectURL(blob);
      currentObjectUrlRef.current = objectUrl;

      const audio = audioRef.current;
      if (!audio) return;

      // Swap src on the SAME persistent element — iOS keeps user-activation across src changes.
      audio.src = objectUrl;
      setIsAiLoading(false);

      audio.onended = () => {
        if (!isPlayingRef.current || myGeneration !== playGenerationRef.current) return;
        const next = index + 1;
        setCurrentIndex(next);
        currentIndexRef.current = next;
        playAiParagraph(next);
      };

      audio.onerror = () => {
        if (myGeneration !== playGenerationRef.current) return;
        setIsPlaying(false);
        setIsAiLoading(false);
        isPlayingRef.current = false;
      };

      // Detect unexpected pauses (e.g. iOS backgrounding) and resume
      audio.onpause = () => {
        if (isPlayingRef.current && myGeneration === playGenerationRef.current && !audio.ended) {
          setTimeout(() => {
            if (isPlayingRef.current && myGeneration === playGenerationRef.current && audio.paused && !audio.ended) {
              audio.play().catch(() => {
                // iOS killed audio session even on persistent element — restart paragraph
                if (isPlayingRef.current && myGeneration === playGenerationRef.current) {
                  playAiParagraph(currentIndexRef.current);
                }
              });
            }
          }, 300);
        }
      };

      await audio.play();
    } catch (err) {
      console.error('AI TTS error:', err);
      setIsPlaying(false);
      setIsAiLoading(false);
      isPlayingRef.current = false;
    }
  }, [autoAdvance, onChapterEnd, fetchAiAudioWithRetry, prefetchNext]);

  // --- Browser TTS ---
  const speakParagraph = useCallback((index: number) => {
    if (index >= paragraphsRef.current.length) {
      setIsPlaying(false);
      setIsPaused(false);
      isPlayingRef.current = false;
      if (autoAdvance) onChapterEnd?.();
      return;
    }

    const text = paragraphsRef.current[index];
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = speedRef.current;
    const voice = speechSynthesis.getVoices().find(v => v.name === voiceRef.current);
    if (voice) utterance.voice = voice;

    utterance.onend = () => {
      if (!isPlayingRef.current) return;
      const next = index + 1;
      setCurrentIndex(next);
      speakParagraph(next);
    };

    utterance.onerror = (e) => {
      if (e.error === 'canceled' || e.error === 'interrupted') return;
      setIsPlaying(false);
      isPlayingRef.current = false;
    };

    utteranceRef.current = utterance;
    setCurrentIndex(index);
    speechSynthesis.speak(utterance);
  }, [autoAdvance, onChapterEnd]);

  const play = useCallback(() => {
    const engine = engineRef.current;

    if (isPaused) {
      if (engine === 'ai' && audioRef.current) {
        // Set before play() so any onpause from the resumed element is handled correctly
        isPlayingRef.current = true;
        audioRef.current.play().catch(() => {});
        setIsPaused(false);
        setIsPlaying(true);
        return;
      }
      speechSynthesis.resume();
      setIsPaused(false);
      setIsPlaying(true);
      isPlayingRef.current = true;
      return;
    }

    // Stop any existing playback (don't null the audio element)
    speechSynthesis.cancel();
    if (audioRef.current) {
      audioRef.current.pause();
    }
    prefetchRef.current = null;

    setIsPlaying(true);
    setIsPaused(false);
    isPlayingRef.current = true;

    if (engine === 'ai') {
      playAiParagraph(currentIndex);
    } else {
      speakParagraph(currentIndex);
    }
  }, [isPaused, currentIndex, speakParagraph, playAiParagraph]);

  const pause = useCallback(() => {
    if (engineRef.current === 'ai' && audioRef.current) {
      // Must be set BEFORE audioRef.current.pause() so the onpause handler
      // (which auto-resumes iOS background pauses) sees isPlayingRef = false
      // and does not treat this intentional pause as an unexpected one.
      isPlayingRef.current = false;
      audioRef.current.pause();
    } else {
      speechSynthesis.pause();
    }
    setIsPaused(true);
    setIsPlaying(false);
  }, []);

  const stop = useCallback(() => {
    playGenerationRef.current++;   // cancel any in-flight AI fetch
    speechSynthesis.cancel();
    if (audioRef.current) {
      audioRef.current.pause();
      // Clear src to stop any pending network load but keep the element alive for iOS
      audioRef.current.src = '';
    }
    prefetchRef.current = null;
    setIsPlaying(false);
    setIsPaused(false);
    setIsAiLoading(false);
    isPlayingRef.current = false;
    setCurrentIndex(0);
    currentIndexRef.current = 0;
  }, []);

  const jumpTo = useCallback((index: number) => {
    const wasPlaying = isPlayingRef.current || isPlaying;
    // Invalidate any in-flight AI fetch BEFORE pausing so onpause handler sees mismatched generation
    playGenerationRef.current++;
    isPlayingRef.current = false;
    speechSynthesis.cancel();
    if (audioRef.current) {
      audioRef.current.pause();
    }
    prefetchRef.current = null;
    setCurrentIndex(index);
    currentIndexRef.current = index;
    if (wasPlaying) {
      isPlayingRef.current = true;
      setIsPlaying(true);
      setIsPaused(false);
      if (engineRef.current === 'ai') {
        playAiParagraph(index);
      } else {
        speakParagraph(index);
      }
    }
  }, [isPlaying, speakParagraph, playAiParagraph]);

  // Resume AI audio when tab/screen becomes visible again (mobile backgrounding)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isPlayingRef.current && engineRef.current === 'ai') {
        const audio = audioRef.current;
        if (audio && audio.paused && !audio.ended && audio.src) {
          audio.play().catch(() => {
            // Audio session destroyed — restart from current paragraph
            playAiParagraph(currentIndexRef.current);
          });
        } else if (!audio?.src) {
          // No src loaded — restart from current paragraph
          playAiParagraph(currentIndexRef.current);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [playAiParagraph]);

  return {
    isPlaying,
    isPaused,
    currentIndex,
    totalParagraphs: paragraphsRef.current.length,
    speed,
    setSpeed,
    voices,
    selectedVoice,
    setSelectedVoice,
    autoAdvance,
    setAutoAdvance,
    setParagraphs,
    play,
    pause,
    stop,
    jumpTo,
    // AI engine
    ttsEngine,
    setTtsEngine,
    selectedAiVoice,
    setSelectedAiVoice,
    aiVoices: AI_VOICES,
    isAiLoading,
  };
}
