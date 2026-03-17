import { useState } from 'react';
import { AlertTriangle, Info, X } from 'lucide-react';
import { useAdminPublicSettings } from '@/contexts/AdminPublicSettingsContext';

const AnnouncementBanner = () => {
  const { maintenanceMode, announcementMessage } = useAdminPublicSettings();
  const [dismissed, setDismissed] = useState(false);

  if (maintenanceMode) {
    return (
      <div
        role="alert"
        aria-live="assertive"
        className="w-full bg-destructive/10 border-b border-destructive/20 px-4 py-2.5 flex items-center gap-3"
      >
        <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0" aria-hidden="true" />
        <p className="text-sm text-foreground flex-1 font-medium">
          {announcementMessage || 'The site is currently under maintenance. Some features may be unavailable.'}
        </p>
      </div>
    );
  }

  if (!announcementMessage || dismissed) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="w-full bg-primary/10 border-b border-primary/20 px-4 py-2.5 flex items-center gap-3"
    >
      <Info className="w-4 h-4 text-primary flex-shrink-0" aria-hidden="true" />
      <p className="text-sm text-foreground flex-1">{announcementMessage}</p>
      <button
        onClick={() => setDismissed(true)}
        className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
        aria-label="Dismiss announcement"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export default AnnouncementBanner;
