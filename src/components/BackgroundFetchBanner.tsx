import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, X } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { getFetchAllState, subscribeFetchAll, cancelFetchAll } from '@/lib/background-fetch';

/**
 * A floating banner that shows background fetch progress on any page.
 * Renders nothing if no fetch is running.
 */
const BackgroundFetchBanner = () => {
  const [state, setState] = useState(getFetchAllState);
  const navigate = useNavigate();

  useEffect(() => subscribeFetchAll(() => setState(getFetchAllState())), []);

  if (!state.isFetching) return null;

  const { current, total, novelTitle, novelId } = state.progress;
  const pct = total ? (current / total) * 100 : 0;

  return (
    <div className="mx-4 mb-2 flex items-center gap-3 px-4 py-2.5 rounded-lg bg-primary/10 border border-primary/20">
      <Loader2 className="w-4 h-4 text-primary animate-spin flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <button
          onClick={() => navigate(`/reader/${novelId}`)}
          className="text-sm font-sans-ui text-foreground hover:underline truncate block text-left"
        >
          Fetching "{novelTitle}" — {current}/{total} chapters
        </button>
        <Progress value={pct} className="h-1 mt-1" />
      </div>
      <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onClick={cancelFetchAll} aria-label="Cancel fetch">
        <X className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
};

export default BackgroundFetchBanner;
