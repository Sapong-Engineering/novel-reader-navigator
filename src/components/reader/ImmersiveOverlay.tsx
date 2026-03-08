import { X, Volume2, VolumeX, Droplets, Flame, Coffee } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import type { AmbientSound } from '@/hooks/useImmersiveMode';

interface ImmersiveOverlayProps {
  visible: boolean;
  ambientSound: AmbientSound;
  onSoundChange: (s: AmbientSound) => void;
  volume: number;
  onVolumeChange: (v: number) => void;
  onExit: () => void;
}

const soundOptions: { value: AmbientSound; icon: typeof Droplets; label: string }[] = [
  { value: 'rain', icon: Droplets, label: 'Rain' },
  { value: 'fireplace', icon: Flame, label: 'Fire' },
  { value: 'cafe', icon: Coffee, label: 'Café' },
];

const ImmersiveOverlay = ({
  visible,
  ambientSound,
  onSoundChange,
  volume,
  onVolumeChange,
  onExit,
}: ImmersiveOverlayProps) => {
  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-500 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
      }`}
    >
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-card/90 backdrop-blur-xl border border-border/50 shadow-lg">
        {/* Sound toggles */}
        {soundOptions.map(({ value, icon: Icon, label }) => (
          <Button
            key={value}
            variant="ghost"
            size="icon"
            className={`h-8 w-8 rounded-full ${
              ambientSound === value ? 'bg-primary/20 text-primary' : 'text-muted-foreground'
            }`}
            onClick={() => onSoundChange(ambientSound === value ? 'off' : value)}
            title={label}
          >
            <Icon className="w-4 h-4" />
          </Button>
        ))}

        {/* Volume */}
        {ambientSound !== 'off' && (
          <div className="flex items-center gap-1.5 ml-1">
            <VolumeX className="w-3.5 h-3.5 text-muted-foreground" />
            <Slider
              value={[volume]}
              onValueChange={([v]) => onVolumeChange(v)}
              min={0}
              max={1}
              step={0.05}
              className="w-20"
            />
            <Volume2 className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
        )}

        <div className="w-px h-5 bg-border mx-1" />

        {/* Exit */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
          onClick={onExit}
          title="Exit immersive mode"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default ImmersiveOverlay;
