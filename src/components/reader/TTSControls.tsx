import { Play, Pause, Square, SkipForward, SkipBack, ChevronFirst, Volume2, Mic2, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { TTSSpeed, TTSEngine, AIVoice } from '@/hooks/useTTS';

interface TTSControlsProps {
  isPlaying: boolean;
  isPaused: boolean;
  currentIndex: number;
  totalParagraphs: number;
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
  // AI engine props
  ttsEngine: TTSEngine;
  onEngineChange: (e: TTSEngine) => void;
  aiVoices: AIVoice[];
  selectedAiVoice: string;
  onAiVoiceChange: (v: string) => void;
  isAiLoading?: boolean;
}

const speeds: TTSSpeed[] = [0.5, 0.75, 1, 1.25, 1.5, 2];

const TTSControls = ({
  isPlaying,
  isPaused,
  currentIndex,
  totalParagraphs,
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
}: TTSControlsProps) => {
  const progress = totalParagraphs > 0 ? ((currentIndex + 1) / totalParagraphs) * 100 : 0;
  const isAi = ttsEngine === 'ai';

  return (
    <div className="border-t border-border bg-card/90 backdrop-blur-sm">
      {/* Progress bar */}
      <div className="h-0.5 w-full bg-muted/50">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="px-3 sm:px-4 py-2 flex items-center gap-2 flex-wrap">
        {/* Engine toggle */}
        <ToggleGroup
          type="single"
          value={ttsEngine}
          onValueChange={(v) => { if (v) onEngineChange(v as TTSEngine); }}
          size="sm"
          className="h-7"
        >
          <ToggleGroupItem value="browser" className="text-xs h-7 px-2 font-sans-ui">
            <Volume2 className="w-3 h-3 mr-1" />
            <span className="hidden sm:inline">Browser</span>
          </ToggleGroupItem>
          <ToggleGroupItem value="ai" className="text-xs h-7 px-2 font-sans-ui">
            <Sparkles className="w-3 h-3 mr-1" />
            AI
          </ToggleGroupItem>
        </ToggleGroup>

        <div className="w-px h-5 bg-border mx-0.5 hidden sm:block" />

        {/* Play/Pause/Stop */}
        <div className="flex items-center gap-1">
          {isPlaying ? (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onPause} title="Pause">
              <Pause className="w-4 h-4" />
            </Button>
          ) : (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onPlay} title={isPaused ? 'Resume' : 'Play'} disabled={isAiLoading}>
              {isAiLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onStop} title="Stop" disabled={!isPlaying && !isPaused}>
            <Square className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* In-chapter skip controls */}
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost" size="icon" className="h-7 w-7"
            onClick={() => onJumpTo(0)}
            disabled={currentIndex === 0}
            title="Restart from beginning"
          >
            <ChevronFirst className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost" size="icon" className="h-7 w-7"
            onClick={() => onJumpTo(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
            title="Back 1 paragraph"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost" size="icon" className="h-7 w-7"
            onClick={() => onJumpTo(Math.min(totalParagraphs - 1, currentIndex + 1))}
            disabled={currentIndex >= totalParagraphs - 1}
            title="Forward 1 paragraph"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Paragraph counter */}
        <span className="text-xs text-muted-foreground font-sans-ui whitespace-nowrap">
          {currentIndex + 1}/{totalParagraphs}
        </span>

        <div className="w-px h-5 bg-border mx-1 hidden sm:block" />

        {/* Speed */}
        <Select value={String(speed)} onValueChange={(v) => onSpeedChange(Number(v) as TTSSpeed)}>
          <SelectTrigger className="h-7 w-[70px] text-xs font-sans-ui">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {speeds.map(s => (
              <SelectItem key={s} value={String(s)} className="text-xs">{s}x</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Voice selector — always visible, wraps to second row on narrow screens */}
        {isAi ? (
          <Select value={selectedAiVoice} onValueChange={onAiVoiceChange}>
            <SelectTrigger className="h-7 w-[100px] text-xs font-sans-ui flex">
              <Sparkles className="w-3 h-3 mr-1 flex-shrink-0 text-primary" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {aiVoices.map(v => (
                <SelectItem key={v.id} value={v.id} className="text-xs">{v.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          voices.length > 0 && (
            <Select value={selectedVoice} onValueChange={onVoiceChange}>
              <SelectTrigger className="h-7 w-[120px] text-xs font-sans-ui flex">
                <Mic2 className="w-3 h-3 mr-1 flex-shrink-0" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {voices.map(v => (
                  <SelectItem key={v.name} value={v.name} className="text-xs">{v.name.split(' ').slice(0, 3).join(' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )
        )}

        <div className="flex-1" />

        {/* Auto-advance — label always visible */}
        <div className="flex items-center gap-1.5">
          <Label htmlFor="tts-auto" className="text-xs text-muted-foreground font-sans-ui">
            Auto-next
          </Label>
          <Switch id="tts-auto" checked={autoAdvance} onCheckedChange={onAutoAdvanceChange} className="scale-75" />
        </div>
      </div>
    </div>
  );
};

export default TTSControls;
