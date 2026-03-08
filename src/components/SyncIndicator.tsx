import { Cloud, CloudOff, Loader2, CheckCircle2 } from 'lucide-react';
import { useSyncStatus } from '@/hooks/useSyncStatus';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const SyncIndicator = () => {
  const status = useSyncStatus();

  if (status === 'idle') return null;

  const config = {
    syncing: {
      icon: <Loader2 className="w-4 h-4 animate-spin text-primary" />,
      label: 'Syncing…',
    },
    done: {
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
      label: 'Synced',
    },
    error: {
      icon: <CloudOff className="w-4 h-4 text-destructive" />,
      label: 'Sync failed',
    },
  }[status];

  if (!config) return null;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50 text-xs font-sans-ui text-muted-foreground select-none">
            {config.icon}
            <span className="hidden sm:inline">{config.label}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>{config.label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default SyncIndicator;
