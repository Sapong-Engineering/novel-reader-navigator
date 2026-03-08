import { useState, useCallback, useRef, useEffect } from 'react';

export type TTSSpeed = 0.5 | 0.75 | 1 | 1.25 | 1.5 | 2;

export function useTTS(onChapterEnd?: () => void) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [speed, setSpeed] = useState<TTSSpeed>(1);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const [autoAdvance, setAutoAdvance] = useState(true);

  const paragraphsRef = useRef<string[]>([]);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const isPlayingRef = useRef(false);
  const speedRef = useRef(speed);
  const voiceRef = useRef(selectedVoice);

  speedRef.current = speed;
  voiceRef.current = selectedVoice;

  // Load voices
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
  }, []);

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
    if (isPaused) {
      speechSynthesis.resume();
      setIsPaused(false);
      setIsPlaying(true);
      isPlayingRef.current = true;
      return;
    }
    speechSynthesis.cancel();
    setIsPlaying(true);
    setIsPaused(false);
    isPlayingRef.current = true;
    speakParagraph(currentIndex);
  }, [isPaused, currentIndex, speakParagraph]);

  const pause = useCallback(() => {
    speechSynthesis.pause();
    setIsPaused(true);
    setIsPlaying(false);
  }, []);

  const stop = useCallback(() => {
    speechSynthesis.cancel();
    setIsPlaying(false);
    setIsPaused(false);
    isPlayingRef.current = false;
    setCurrentIndex(0);
  }, []);

  const jumpTo = useCallback((index: number) => {
    speechSynthesis.cancel();
    setCurrentIndex(index);
    if (isPlayingRef.current || isPlaying) {
      isPlayingRef.current = true;
      setIsPlaying(true);
      setIsPaused(false);
      speakParagraph(index);
    }
  }, [isPlaying, speakParagraph]);

  // Cleanup
  useEffect(() => {
    return () => {
      speechSynthesis.cancel();
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
  };
}
