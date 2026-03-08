import { AlertTriangle, RefreshCw, X } from 'lucide-react';
import { useSyncStatus, dismissSyncError } from '@/hooks/useSyncStatus';
import { replayOfflineQueue } from '@/lib/sync-service';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

const SyncErrorBanner = () => {
  const status = useSyncStatus();
  const [retrying, setRetrying] = useState(false);

  if (status !== 'error') return null;

  const handleRetry = async () => {
    setRetrying(true);
    try {
      await replayOfflineQueue();
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-md animate-in slide-in-from-bottom-4 fade-in duration-300"
    >
      <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-destructive/10 border border-destructive/20 shadow-lg backdrop-blur-sm">
        <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0" aria-hidden="true" />
        <p className="text-sm font-sans-ui text-foreground flex-1">
          Sync failed. Your changes are saved locally.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRetry}
          disabled={retrying}
          className="flex-shrink-0 border-destructive/30 text-destructive hover:bg-destructive/10"
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${retrying ? 'animate-spin' : ''}`} aria-hidden="true" />
          Retry
        </Button>
        <button
          onClick={dismissSyncError}
          className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
          aria-label="Dismiss sync error"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default SyncErrorBanner;
