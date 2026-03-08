import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Minus, Plus, RotateCcw, ListOrdered } from 'lucide-react';
import { useReaderContext } from '@/contexts/ReaderContext';
import type { ReaderSettings } from '@/contexts/ReaderContext';

interface ReaderSettingsPopoverProps {
  onRepairChapterOrder?: () => void;
}

const FONT_FAMILIES: { value: ReaderSettings['fontFamily']; label: string }[] = [
  { value: 'serif', label: 'Serif' },
  { value: 'sans-serif', label: 'Sans' },
  { value: 'monospace', label: 'Mono' },
];

export function ReaderSettingsPopover({ onRepairChapterOrder }: ReaderSettingsPopoverProps) {
  const { settings, setFontSize, setFontFamily, resetSettings } = useReaderContext();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="font-sans-ui hidden sm:inline-flex px-2.5"
          aria-label="Reader settings"
        >
          <span className="text-sm font-semibold tracking-tight leading-none">Aa</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-3 space-y-3" align="end">
        {/* Font size */}
        <div>
          <p className="text-xs text-muted-foreground font-sans-ui mb-1.5">Font size</p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => setFontSize(settings.fontSize - 1)}
              disabled={settings.fontSize <= 12}
              aria-label="Decrease font size"
            >
              <Minus className="w-3 h-3" />
            </Button>
            <span className="flex-1 text-center text-sm font-sans-ui tabular-nums">
              {settings.fontSize}px
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => setFontSize(settings.fontSize + 1)}
              disabled={settings.fontSize >= 24}
              aria-label="Increase font size"
            >
              <Plus className="w-3 h-3" />
            </Button>
          </div>
        </div>

        <Separator />

        {/* Font family */}
        <div>
          <p className="text-xs text-muted-foreground font-sans-ui mb-1.5">Font</p>
          <div className="flex gap-1">
            {FONT_FAMILIES.map(({ value, label }) => (
              <Button
                key={value}
                variant={settings.fontFamily === value ? 'default' : 'outline'}
                size="sm"
                className="flex-1 h-7 text-xs font-sans-ui"
                onClick={() => setFontFamily(value)}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>

        <Separator />

        {/* Reset */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full h-7 text-xs text-muted-foreground font-sans-ui"
          onClick={resetSettings}
        >
          <RotateCcw className="w-3 h-3 mr-1.5" />
          Reset defaults
        </Button>
      </PopoverContent>
    </Popover>
  );
}
