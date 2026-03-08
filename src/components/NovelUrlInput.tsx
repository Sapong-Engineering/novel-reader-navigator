import { useState } from 'react';
import { BookOpen, Loader2, Link } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface NovelUrlInputProps {
  onSubmit: (url: string) => void;
  isLoading?: boolean;
}

const NovelUrlInput = ({ onSubmit, isLoading }: NovelUrlInputProps) => {
  const [url, setUrl] = useState('https://www.empirenovel.com/novel/swallowed-star/');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) onSubmit(url.trim());
  };

  return (
    <div className="w-full max-w-2xl mx-auto animate-fade-in">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
          <BookOpen className="w-8 h-8 text-primary" aria-hidden="true" />
        </div>
        <h1 className="text-3xl font-bold font-sans-ui tracking-tight mb-2">
          Novel Reader
        </h1>
        <p className="text-muted-foreground font-sans-ui">
          Paste a novel URL to start reading, saving, and downloading chapters
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-3">
        <div className="relative flex-1">
          <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
          <Input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.empirenovel.com/novel/swallowed-star/"
            className="pl-10 h-12 bg-card border-border font-sans-ui"
            aria-label="Novel URL"
            required
          />
        </div>
        <Button type="submit" disabled={isLoading} className="h-12 px-6 font-sans-ui">
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            'Fetch Novel'
          )}
        </Button>
      </form>
    </div>
  );
};

export default NovelUrlInput;
