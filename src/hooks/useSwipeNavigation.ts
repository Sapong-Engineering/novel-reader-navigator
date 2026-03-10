import { useRef, useEffect, useCallback } from 'react';

interface UseSwipeNavigationOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number;
  enabled?: boolean;
}

export function useSwipeNavigation({
  onSwipeLeft,
  onSwipeRight,
  threshold = 80,
  enabled = true,
}: UseSwipeNavigationOptions) {
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const touchEnd = useRef<{ x: number; y: number } | null>(null);

  const onTouchStart = useCallback((e: TouchEvent) => {
    if (!enabled) return;
    touchEnd.current = null;
    touchStart.current = {
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    };
  }, [enabled]);

  const onTouchMove = useCallback((e: TouchEvent) => {
    if (!enabled) return;
    touchEnd.current = {
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    };
  }, [enabled]);

  const onTouchEnd = useCallback(() => {
    if (!enabled || !touchStart.current || !touchEnd.current) return;

    const deltaX = touchStart.current.x - touchEnd.current.x;
    const deltaY = touchStart.current.y - touchEnd.current.y;

    // Only trigger if horizontal swipe is dominant (not vertical scrolling)
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > threshold) {
      if (deltaX > 0) {
        onSwipeLeft?.(); // Swipe left → next chapter
      } else {
        onSwipeRight?.(); // Swipe right → prev chapter
      }
    }

    touchStart.current = null;
    touchEnd.current = null;
  }, [enabled, threshold, onSwipeLeft, onSwipeRight]);

  const bindSwipe = useCallback((el: HTMLElement | null) => {
    if (!el) return;

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: true });
    el.addEventListener('touchend', onTouchEnd);

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [onTouchStart, onTouchMove, onTouchEnd]);

  return { bindSwipe };
}
