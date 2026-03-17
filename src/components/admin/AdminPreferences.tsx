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
import { Loader2, Palette, Bot, Wrench, Sparkles, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { type CleaningRule } from '@/lib/api/admin';
import AmbientSoundManager from './AmbientSoundManager';

type Settings = Record<string, any>;

const AdminPreferences = () => {
  const [settings, setSettings] = useState<Settings>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [cleaningRules, setCleaningRules] = useState<CleaningRule[]>([]);

  useEffect(() => {
    Promise.all([
      adminApi.getSettings(),
      adminApi.listCleaningRules(),
    ]).then(([s, rules]) => {
      setSettings(s || {});
      setCleaningRules(rules || []);
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
                onValueChange={([v]) => setSettings(prev => ({ ...prev, default_font_size: v }))}
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

      {/* Content Cleaning */}
      <Card className="border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Sparkles className="w-4 h-4 text-primary" /> Content Cleaning
              </CardTitle>
              <CardDescription>
                AI-assisted noise removal. Generated rules are stored in the database and apply
                to future chapter fetches without redeployment.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Cleaning Mode</Label>
              <Select
                value={settings.cleaning_mode || 'rule-based'}
                onValueChange={v => updateSetting('cleaning_mode', v)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="rule-based">Rule-Based (no AI cost)</SelectItem>
                  <SelectItem value="hybrid">Hybrid (AI on suspect content)</SelectItem>
                  <SelectItem value="ai">AI (always analyze)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Hybrid activates AI only when suspect content survives rule-based cleaning.
              </p>
            </div>
            <div className="space-y-2">
              <Label>AI Model</Label>
              <Select
                value={settings.cleaning_mode_ai_model || 'gpt-4o-mini'}
                onValueChange={v => updateSetting('cleaning_mode_ai_model', v)}
                disabled={!['hybrid', 'ai'].includes(settings.cleaning_mode)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="gpt-4o-mini">GPT-4o Mini (fast, low cost)</SelectItem>
                  <SelectItem value="gpt-4o">GPT-4o (highest accuracy)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                Generated Rules
                {cleaningRules.length > 0 && (
                  <span className="ml-2 normal-case font-normal">({cleaningRules.length})</span>
                )}
              </Label>
              {cleaningRules.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={async () => {
                    await Promise.all(cleaningRules.map(r => adminApi.deleteCleaningRule(r.id)));
                    setCleaningRules([]);
                    toast.success('All cleaning rules cleared');
                  }}
                >
                  Clear All
                </Button>
              )}
            </div>
            {cleaningRules.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No generated rules yet. Rules appear here after AI mode analyzes a chapter.
              </p>
            ) : (
              <div className="space-y-2">
                {cleaningRules.map(rule => (
                  <div key={rule.id} className="flex items-start gap-3 rounded-md border border-border p-3">
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium truncate">{rule.description}</span>
                        <Badge
                          variant="outline"
                          className={rule.created_by === null
                            ? 'border-amber-500 text-amber-600'
                            : 'border-blue-500 text-blue-600'}
                        >
                          {rule.created_by === null ? 'AI' : 'Manual'}
                        </Badge>
                      </div>
                      <code
                        className="block text-xs text-muted-foreground truncate"
                        title={`/${rule.pattern}/${rule.flags}`}
                      >
                        /{rule.pattern.length > 50 ? rule.pattern.slice(0, 50) + '…' : rule.pattern}/{rule.flags}
                      </code>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={async () => {
                        await adminApi.deleteCleaningRule(rule.id);
                        setCleaningRules(prev => prev.filter(r => r.id !== rule.id));
                        toast.success('Rule deleted');
                      }}
                      aria-label="Delete rule"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
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
