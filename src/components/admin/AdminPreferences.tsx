import { useState, useEffect, useCallback } from 'react';
import { adminApi } from '@/lib/api/admin';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Loader2, Palette, Bot, Wrench } from 'lucide-react';
import AmbientSoundManager from './AmbientSoundManager';

type Settings = Record<string, any>;

const AdminPreferences = () => {
  const [settings, setSettings] = useState<Settings>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    adminApi.getSettings().then(s => {
      setSettings(s || {});
      setLoading(false);
    }).catch(() => {
      toast.error('Failed to load settings');
      setLoading(false);
    });
  }, []);

  const updateSetting = useCallback(async (key: string, value: any) => {
    setSaving(key);
    setSettings(prev => ({ ...prev, [key]: value }));
    try {
      await adminApi.updateSetting(key, value);
    } catch {
      toast.error(`Failed to save ${key}`);
    } finally {
      setSaving(null);
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* App-Wide Defaults */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Palette className="w-4 h-4 text-primary" /> App-Wide Defaults
          </CardTitle>
          <CardDescription>Default settings applied to new users.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Default Font Family</Label>
              <Select
                value={settings.default_font_family || 'serif'}
                onValueChange={v => updateSetting('default_font_family', v)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="serif">Serif</SelectItem>
                  <SelectItem value="sans-serif">Sans-serif</SelectItem>
                  <SelectItem value="monospace">Monospace</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Default Font Size: {settings.default_font_size || 16}px</Label>
              <Slider
                value={[settings.default_font_size || 16]}
                min={12}
                max={24}
                step={1}
                onValueCommit={([v]) => updateSetting('default_font_size', v)}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Default Theme</Label>
              <Select
                value={settings.default_theme || 'system'}
                onValueChange={v => updateSetting('default_theme', v)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Default Refresh Interval (hours)</Label>
              <Input
                type="number"
                min={1}
                max={168}
                value={settings.default_refresh_interval || 24}
                onChange={e => {
                  const v = parseInt(e.target.value);
                  if (v >= 1 && v <= 168) updateSetting('default_refresh_interval', v);
                }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Label>Notifications Enabled by Default</Label>
            <Switch
              checked={settings.default_notifications ?? true}
              onCheckedChange={v => updateSetting('default_notifications', v)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Scraper Configuration */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Bot className="w-4 h-4 text-primary" /> Scraper Configuration
          </CardTitle>
          <CardDescription>Control scraping adapters and rate limits.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-3">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Enabled Adapters</Label>
            {([
              { name: 'WuxiaClick', note: '' },
              { name: 'NovelBin', note: '' },
              { name: 'EmpireNovel', note: '' },
              { name: 'Gutenberg', note: 'Public domain books — full text parse, slower initial load' },
            ] as { name: string; note: string }[]).map(({ name, note }) => {
              const key = `adapter_${name.toLowerCase()}`;
              return (
                <div key={name} className="flex items-center justify-between gap-4">
                  <div>
                    <Label>{name}</Label>
                    {note && <p className="text-xs text-muted-foreground mt-0.5">{note}</p>}
                  </div>
                  <Switch
                    checked={settings[key] ?? true}
                    onCheckedChange={v => updateSetting(key, v)}
                  />
                </div>
              );
            })}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Rate Limit (requests/min)</Label>
              <Input
                type="number"
                min={1}
                max={60}
                value={settings.scrape_rate_limit || 10}
                onChange={e => {
                  const v = parseInt(e.target.value);
                  if (v >= 1 && v <= 60) updateSetting('scrape_rate_limit', v);
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>Max Concurrent Scrapes</Label>
              <Input
                type="number"
                min={1}
                max={10}
                value={settings.max_concurrent_scrapes || 3}
                onChange={e => {
                  const v = parseInt(e.target.value);
                  if (v >= 1 && v <= 10) updateSetting('max_concurrent_scrapes', v);
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Maintenance Controls */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Wrench className="w-4 h-4 text-primary" /> Maintenance Controls
          </CardTitle>
          <CardDescription>Manage registration and system announcements.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <Label>Registration Open</Label>
              <p className="text-xs text-muted-foreground">Allow new user sign-ups</p>
            </div>
            <Switch
              checked={settings.registration_open ?? true}
              onCheckedChange={v => updateSetting('registration_open', v)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Maintenance Mode</Label>
              <p className="text-xs text-muted-foreground">Show maintenance banner to all users</p>
            </div>
            <Switch
              checked={settings.maintenance_mode ?? false}
              onCheckedChange={v => updateSetting('maintenance_mode', v)}
            />
          </div>

          <div className="space-y-2">
            <Label>Announcement Message</Label>
            <Textarea
              placeholder="Enter an announcement to display to all users..."
              value={settings.announcement_message || ''}
              onChange={e => updateSetting('announcement_message', e.target.value)}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Ambient Sounds */}
      <AmbientSoundManager />

      {saving && (
        <div className="fixed bottom-4 right-4 bg-card border border-border rounded-lg px-3 py-2 shadow-lg flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-3 h-3 animate-spin" /> Saving...
        </div>
      )}
    </div>
  );
};

export default AdminPreferences;
