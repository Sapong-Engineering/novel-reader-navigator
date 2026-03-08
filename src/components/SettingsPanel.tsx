import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings, Sun, Moon, Monitor, Minus, Plus, RefreshCw, Wrench, RotateCcw } from 'lucide-react';
import { useThemeContext } from '@/contexts/ThemeContext';
import { useReaderContext } from '@/contexts/ReaderContext';
import { useAppSettings } from '@/contexts/AppSettingsContext';
import { type ReactNode } from 'react';

interface SettingsPanelProps {
  onSync?: () => void;
  onRepairChapterOrder?: () => void;
  trigger?: ReactNode;
}

const SettingsPanel = ({ onSync, onRepairChapterOrder, trigger }: SettingsPanelProps) => {
  const { resolvedTheme, setTheme } = useThemeContext();
  const { settings: readerSettings, setFontSize, setFontFamily } = useReaderContext();
  const appSettings = useAppSettings();

  const themeOptions = [
    { value: 'light', icon: Sun, label: 'Light' },
    { value: 'dark', icon: Moon, label: 'Dark' },
    { value: 'system', icon: Monitor, label: 'System' },
  ] as const;

  const fontOptions = [
    { value: 'serif' as const, label: 'Serif' },
    { value: 'sans-serif' as const, label: 'Sans' },
    { value: 'monospace' as const, label: 'Mono' },
  ];

  return (
    <Sheet>
      <SheetTrigger asChild>
        {trigger ?? (
          <Button variant="ghost" size="icon" aria-label="Settings">
            <Settings className="w-4 h-4" />
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-sans-ui">Settings</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* ── Appearance ── */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-sans-ui mb-3">
              Appearance
            </h3>
            <div className="flex gap-2">
              {themeOptions.map(opt => {
                const Icon = opt.icon;
                const active = resolvedTheme === opt.value || (opt.value === 'system' && !['light', 'dark'].includes(resolvedTheme ?? ''));
                return (
                  <Button
                    key={opt.value}
                    variant={active ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTheme(opt.value)}
                    className="flex-1 font-sans-ui"
                  >
                    <Icon className="w-4 h-4 mr-1.5" />
                    {opt.label}
                  </Button>
                );
              })}
            </div>
          </section>

          <Separator />

          {/* ── Reader ── */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-sans-ui mb-3">
              Reader
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-sans-ui text-foreground mb-2 block">
                  Font Size: {readerSettings.fontSize}px
                </label>
                <div className="flex items-center gap-3">
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setFontSize(readerSettings.fontSize - 1)}>
                    <Minus className="w-3 h-3" />
                  </Button>
                  <Slider
                    value={[readerSettings.fontSize]}
                    min={12}
                    max={24}
                    step={1}
                    onValueChange={([v]) => setFontSize(v)}
                    className="flex-1"
                  />
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setFontSize(readerSettings.fontSize + 1)}>
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-sm font-sans-ui text-foreground mb-2 block">Font Family</label>
                <div className="flex gap-2">
                  {fontOptions.map(opt => (
                    <Button
                      key={opt.value}
                      variant={readerSettings.fontFamily === opt.value ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFontFamily(opt.value)}
                      className="flex-1 font-sans-ui"
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <Separator />

          {/* ── Sync & Data ── */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-sans-ui mb-3">
              Sync &amp; Data
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-sans-ui text-foreground">Cloud Sync</p>
                  <p className="text-xs text-muted-foreground font-sans-ui">Sync library across devices</p>
                </div>
                <Switch
                  checked={appSettings.syncEnabled}
                  onCheckedChange={appSettings.setSyncEnabled}
                />
              </div>
              {onSync && (
                <Button variant="outline" size="sm" onClick={onSync} className="w-full font-sans-ui" disabled={!appSettings.syncEnabled}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Sync Now
                </Button>
              )}
              <div>
                <label className="text-sm font-sans-ui text-foreground mb-2 block">Auto-refresh interval</label>
                <Select
                  value={String(appSettings.refreshIntervalHours)}
                  onValueChange={(v) => appSettings.setRefreshIntervalHours(Number(v))}
                  disabled={!appSettings.syncEnabled}
                >
                  <SelectTrigger className="font-sans-ui">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="6">Every 6 hours</SelectItem>
                    <SelectItem value="12">Every 12 hours</SelectItem>
                    <SelectItem value="24">Every 24 hours</SelectItem>
                    <SelectItem value="48">Every 48 hours</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground font-sans-ui mt-1">How often the backend checks for new chapters</p>
              </div>
              {onRepairChapterOrder && (
                <Button variant="outline" size="sm" onClick={onRepairChapterOrder} className="w-full font-sans-ui">
                  <Wrench className="w-4 h-4 mr-2" />
                  Repair Chapter Order
                </Button>
              )}
            </div>
          </section>

          <Separator />

          {/* ── Notifications ── */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-sans-ui mb-3">
              Notifications
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-sans-ui text-foreground">Sync Updates</p>
                  <p className="text-xs text-muted-foreground font-sans-ui">Show notifications for sync events</p>
                </div>
                <Switch
                  checked={appSettings.notificationsEnabled}
                  onCheckedChange={appSettings.setNotificationsEnabled}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-sans-ui text-foreground">New Chapters</p>
                  <p className="text-xs text-muted-foreground font-sans-ui">Alert when new chapters are found</p>
                </div>
                <Switch
                  checked={appSettings.notifyNewChapters}
                  onCheckedChange={appSettings.setNotifyNewChapters}
                  disabled={!appSettings.notificationsEnabled}
                />
              </div>
            </div>
          </section>

          <Separator />

          {/* ── Reset ── */}
          <Button
            variant="ghost"
            size="sm"
            onClick={appSettings.resetAll}
            className="w-full font-sans-ui text-muted-foreground"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset All to Defaults
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default SettingsPanel;
