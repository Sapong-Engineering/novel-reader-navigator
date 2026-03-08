import { useState, useEffect, useCallback } from 'react';

type SyncState = 'idle' | 'syncing' | 'done' | 'error';

let listeners: Set<(state: SyncState) => void> = new Set();
let currentState: SyncState = 'idle';
let doneTimer: ReturnType<typeof setTimeout> | null = null;

function notify(state: SyncState) {
  currentState = state;
  listeners.forEach(fn => fn(state));

  if (state === 'done') {
    if (doneTimer) clearTimeout(doneTimer);
    doneTimer = setTimeout(() => notify('idle'), 2000);
  }
}

/** Call from sync-service to broadcast status changes */
export function setSyncStatus(state: SyncState) {
  notify(state);
}

/** React hook to consume sync status */
export function useSyncStatus(): SyncState {
  const [state, setState] = useState<SyncState>(currentState);

  useEffect(() => {
    listeners.add(setState);
    return () => { listeners.delete(setState); };
  }, []);

  return state;
}
