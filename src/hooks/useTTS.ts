import { useState, useCallback, useRef, useEffect } from 'react';

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
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const prefetchRef = useRef<{ index: number; blob: Blob } | null>(null);
  const engineRef = useRef(ttsEngine);
  const aiVoiceRef = useRef(selectedAiVoice);

  speedRef.current = speed;
  voiceRef.current = selectedVoice;
  engineRef.current = ttsEngine;
  aiVoiceRef.current = selectedAiVoice;

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
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/openai-tts`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
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

  const prefetchNext = useCallback((nextIndex: number) => {
    if (nextIndex >= paragraphsRef.current.length) return;
    const text = paragraphsRef.current[nextIndex];
    fetchAiAudio(text)
      .then(blob => { prefetchRef.current = { index: nextIndex, blob }; })
      .catch(() => { /* silent prefetch failure */ });
  }, [fetchAiAudio]);

  const playAiParagraph = useCallback(async (index: number) => {
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

    try {
      let blob: Blob;
      if (prefetchRef.current?.index === index) {
        blob = prefetchRef.current.blob;
        prefetchRef.current = null;
      } else {
        blob = await fetchAiAudio(paragraphsRef.current[index]);
      }

      if (!isPlayingRef.current) return;

      const objectUrl = URL.createObjectURL(blob);
      const audio = new Audio(objectUrl);
      audioRef.current = audio;
      setIsAiLoading(false);

      audio.onended = () => {
        URL.revokeObjectURL(objectUrl);
        if (!isPlayingRef.current) return;
        const next = index + 1;
        setCurrentIndex(next);
        playAiParagraph(next);
      };

      audio.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        setIsPlaying(false);
        setIsAiLoading(false);
        isPlayingRef.current = false;
      };

      await audio.play();
      // Prefetch next paragraph
      prefetchNext(index + 1);
    } catch (err) {
      console.error('AI TTS error:', err);
      setIsPlaying(false);
      setIsAiLoading(false);
      isPlayingRef.current = false;
    }
  }, [autoAdvance, onChapterEnd, fetchAiAudio, prefetchNext]);

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
        audioRef.current.play();
        setIsPaused(false);
        setIsPlaying(true);
        isPlayingRef.current = true;
        return;
      }
      speechSynthesis.resume();
      setIsPaused(false);
      setIsPlaying(true);
      isPlayingRef.current = true;
      return;
    }

    // Stop any existing playback
    speechSynthesis.cancel();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

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
      audioRef.current.pause();
    } else {
      speechSynthesis.pause();
    }
    setIsPaused(true);
    setIsPlaying(false);
  }, []);

  const stop = useCallback(() => {
    speechSynthesis.cancel();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    prefetchRef.current = null;
    setIsPlaying(false);
    setIsPaused(false);
    setIsAiLoading(false);
    isPlayingRef.current = false;
    setCurrentIndex(0);
  }, []);

  const jumpTo = useCallback((index: number) => {
    speechSynthesis.cancel();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    prefetchRef.current = null;
    setCurrentIndex(index);
    if (isPlayingRef.current || isPlaying) {
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

  // Cleanup
  useEffect(() => {
    return () => {
      speechSynthesis.cancel();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      isPlayingRef.current = false;
    };
  }, []);

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
