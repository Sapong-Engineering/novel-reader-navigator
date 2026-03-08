import { useState, useEffect } from 'react';
import { CloudOff, Loader2, CheckCircle2, WifiOff } from 'lucide-react';
import { useSyncStatus } from '@/hooks/useSyncStatus';
import { getQueueLength } from '@/lib/offline-queue';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const SyncIndicator = () => {
  const status = useSyncStatus();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queueLen, setQueueLen] = useState(getQueueLength());

  useEffect(() => {
    const onOnline = () => { setIsOnline(true); setQueueLen(getQueueLength()); };
    const onOffline = () => { setIsOnline(false); setQueueLen(getQueueLength()); };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    // Refresh queue length periodically when offline
    const interval = setInterval(() => setQueueLen(getQueueLength()), 3000);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      clearInterval(interval);
    };
  }, []);

  // Update queue length on sync status change
  useEffect(() => {
    setQueueLen(getQueueLength());
  }, [status]);

  // Offline state takes priority
  if (!isOnline) {
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-destructive/10 text-xs font-sans-ui text-destructive select-none">
              <WifiOff className="w-4 h-4" />
              <span className="hidden sm:inline">
                Offline{queueLen > 0 ? ` (${queueLen} pending)` : ''}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>You're offline. Changes are saved locally and will sync when you reconnect.</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

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
