import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Music, Upload, Trash2, Loader2, Check, Droplets, Flame, Coffee } from 'lucide-react';

const BUCKET = 'ambient-sounds';
const SOUND_TYPES = [
  { key: 'rain', label: 'Rain', icon: Droplets },
  { key: 'fireplace', label: 'Fireplace', icon: Flame },
  { key: 'cafe', label: 'Café', icon: Coffee },
] as const;

const AmbientSoundManager = () => {
  const [existing, setExisting] = useState<Record<string, boolean>>({});
  const [uploading, setUploading] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const checkExisting = useCallback(async () => {
    const result: Record<string, boolean> = {};
    for (const { key } of SOUND_TYPES) {
      const { data } = await supabase.storage.from(BUCKET).list('', {
        search: `${key}.mp3`,
      });
      result[key] = (data || []).some(f => f.name === `${key}.mp3`);
    }
    setExisting(result);
    setLoading(false);
  }, []);

  useEffect(() => {
    checkExisting();
  }, [checkExisting]);

  const handleUpload = async (soundKey: string, file: File) => {
    if (!file.type.startsWith('audio/')) {
      toast.error('Please select an audio file');
      return;
    }

    setUploading(soundKey);
    try {
      const path = `${soundKey}.mp3`;
      // Remove existing first
      await supabase.storage.from(BUCKET).remove([path]);
      const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
        contentType: file.type,
        upsert: true,
      });
      if (error) throw error;
      toast.success(`${soundKey} sound uploaded`);
      setExisting(prev => ({ ...prev, [soundKey]: true }));
    } catch (err) {
      toast.error(`Upload failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setUploading(null);
    }
  };

  const handleDelete = async (soundKey: string) => {
    try {
      const { error } = await supabase.storage.from(BUCKET).remove([`${soundKey}.mp3`]);
      if (error) throw error;
      toast.success(`${soundKey} sound removed`);
      setExisting(prev => ({ ...prev, [soundKey]: false }));
    } catch (err) {
      toast.error(`Delete failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Music className="w-4 h-4 text-primary" /> Ambient Sounds
        </CardTitle>
        <CardDescription>
          Upload audio files for immersive reading mode. Files are stored in the cloud and served globally.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {SOUND_TYPES.map(({ key, label, icon: Icon }) => (
          <div
            key={key}
            className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30"
          >
            <div className="flex items-center gap-3">
              <Icon className="w-4 h-4 text-muted-foreground" />
              <div>
                <Label className="font-medium">{label}</Label>
                <p className="text-xs text-muted-foreground">
                  {existing[key] ? (
                    <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                      <Check className="w-3 h-3" /> Uploaded
                    </span>
                  ) : (
                    'No file uploaded'
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={uploading === key}
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'audio/*';
                  input.onchange = (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (file) handleUpload(key, file);
                  };
                  input.click();
                }}
              >
                {uploading === key ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Upload className="w-3.5 h-3.5" />
                )}
                <span className="ml-1.5">{existing[key] ? 'Replace' : 'Upload'}</span>
              </Button>
              {existing[key] && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive"
                  onClick={() => handleDelete(key)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </div>
        ))}
        <p className="text-xs text-muted-foreground">
          Tip: Use loopable MP3 files for the best experience. Recommended length: 30s–2min.
        </p>
      </CardContent>
    </Card>
  );
};

export default AmbientSoundManager;
