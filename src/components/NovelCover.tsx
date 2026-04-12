import { useEffect, useMemo, useState } from 'react';
import { Book } from 'lucide-react';
import { getRenderableCoverUrl, markCoverUrlFailed } from '@/lib/cover-image';
import { cn } from '@/lib/utils';

interface NovelCoverProps {
  coverUrl?: string | null;
  title: string;
  alt?: string;
  className?: string;
  imageClassName?: string;
  fallbackClassName?: string;
  iconClassName?: string;
}

const NovelCover = ({
  coverUrl,
  title,
  alt,
  className,
  imageClassName,
  fallbackClassName,
  iconClassName,
}: NovelCoverProps) => {
  const renderableCoverUrl = useMemo(() => getRenderableCoverUrl(coverUrl), [coverUrl]);
  const [hasLoadError, setHasLoadError] = useState(false);

  useEffect(() => {
    setHasLoadError(false);
  }, [renderableCoverUrl]);

  if (!renderableCoverUrl || hasLoadError) {
    return (
      <div className={cn('flex items-center justify-center bg-secondary', className, fallbackClassName)} aria-hidden="true">
        <Book className={cn('w-12 h-12 text-muted-foreground/40', iconClassName)} />
      </div>
    );
  }

  return (
    <img
      src={renderableCoverUrl}
      alt={alt ?? `Cover of ${title}`}
      className={cn(className, imageClassName)}
      onError={() => {
        markCoverUrlFailed(renderableCoverUrl);
        setHasLoadError(true);
      }}
    />
  );
};

export default NovelCover;
