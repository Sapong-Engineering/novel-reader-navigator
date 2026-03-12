import { useRef, useCallback } from 'react';

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
  // Touch tracking (mobile / tablet)
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const touchEnd = useRef<{ x: number; y: number } | null>(null);

  // Pointer tracking (mouse drag on desktop)
  const pointerStart = useRef<{ x: number; y: number } | null>(null);

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

    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > threshold) {
      if (deltaX > 0) onSwipeLeft?.();
      else onSwipeRight?.();
    }

    touchStart.current = null;
    touchEnd.current = null;
  }, [enabled, threshold, onSwipeLeft, onSwipeRight]);

  // Mouse drag support for desktop
  const onPointerDown = useCallback((e: PointerEvent) => {
    if (!enabled || e.pointerType !== 'mouse') return;
    pointerStart.current = { x: e.clientX, y: e.clientY };
  }, [enabled]);

  const onPointerUp = useCallback((e: PointerEvent) => {
    if (!enabled || e.pointerType !== 'mouse' || !pointerStart.current) return;
    const deltaX = pointerStart.current.x - e.clientX;
    const deltaY = pointerStart.current.y - e.clientY;
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > threshold) {
      if (deltaX > 0) onSwipeLeft?.();
      else onSwipeRight?.();
    }
    pointerStart.current = null;
  }, [enabled, threshold, onSwipeLeft, onSwipeRight]);

  const bindSwipe = useCallback((el: HTMLElement | null) => {
    if (!el) return;

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: true });
    el.addEventListener('touchend', onTouchEnd);
    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointerup', onPointerUp);

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointerup', onPointerUp);
    };
  }, [onTouchStart, onTouchMove, onTouchEnd, onPointerDown, onPointerUp]);

  return { bindSwipe };
}
