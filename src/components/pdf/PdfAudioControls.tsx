import { Loader2, Volume2 } from 'lucide-react';
import TTSControls from '@/components/reader/TTSControls';
import type { AIVoice, TTSEngine, TTSSpeed } from '@/hooks/useTTS';

interface PdfAudioControlsProps {
  isPlaying: boolean;
  isPaused: boolean;
  currentIndex: number;
  totalParagraphs: number;
  audioPageNumber: number;
  isAudioTextLoading: boolean;
  hasAudioText: boolean;
  speed: TTSSpeed;
  onSpeedChange: (s: TTSSpeed) => void;
  voices: SpeechSynthesisVoice[];
  selectedVoice: string;
  onVoiceChange: (v: string) => void;
  autoAdvance: boolean;
  onAutoAdvanceChange: (v: boolean) => void;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onJumpTo: (index: number) => void;
  ttsEngine: TTSEngine;
  onEngineChange: (e: TTSEngine) => void;
  aiVoices: AIVoice[];
  selectedAiVoice: string;
  onAiVoiceChange: (v: string) => void;
  isAiLoading?: boolean;
}

const PdfAudioControls = ({
  isPlaying,
  isPaused,
  currentIndex,
  totalParagraphs,
  audioPageNumber,
  isAudioTextLoading,
  hasAudioText,
  speed,
  onSpeedChange,
  voices,
  selectedVoice,
  onVoiceChange,
  autoAdvance,
  onAutoAdvanceChange,
  onPlay,
  onPause,
  onStop,
  onJumpTo,
  ttsEngine,
  onEngineChange,
  aiVoices,
  selectedAiVoice,
  onAiVoiceChange,
  isAiLoading = false,
}: PdfAudioControlsProps) => {
  if (!hasAudioText) {
    return (
      <div className="border-t border-border bg-card/90 backdrop-blur-sm px-4 py-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground font-sans-ui">
          {isAudioTextLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
          ) : (
            <Volume2 className="w-4 h-4 text-muted-foreground" />
          )}
          <span>
            {isAudioTextLoading
              ? `Preparing audio text for page ${audioPageNumber}…`
              : 'No embedded PDF text found on this page yet. OCR fallback is planned next.'}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="border-t border-border bg-card/90 backdrop-blur-sm px-4 pt-2">
        <p className="font-sans-ui text-xs text-muted-foreground">
          Reading PDF page {audioPageNumber} · segment {Math.min(currentIndex + 1, totalParagraphs)}/{totalParagraphs}
        </p>
      </div>
      <TTSControls
        isPlaying={isPlaying}
        isPaused={isPaused}
        currentIndex={currentIndex}
        totalParagraphs={totalParagraphs}
        speed={speed}
        onSpeedChange={onSpeedChange}
        voices={voices}
        selectedVoice={selectedVoice}
        onVoiceChange={onVoiceChange}
        autoAdvance={autoAdvance}
        onAutoAdvanceChange={onAutoAdvanceChange}
        onPlay={onPlay}
        onPause={onPause}
        onStop={onStop}
        onJumpTo={onJumpTo}
        ttsEngine={ttsEngine}
        onEngineChange={onEngineChange}
        aiVoices={aiVoices}
        selectedAiVoice={selectedAiVoice}
        onAiVoiceChange={onAiVoiceChange}
        isAiLoading={isAiLoading}
      />
    </div>
  );
};

export default PdfAudioControls;
